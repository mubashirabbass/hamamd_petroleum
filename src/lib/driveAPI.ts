/**
 * driveAPI.ts — Google Drive Backup API (Tauri Command Wrappers)
 * ==============================================================
 * All Google API calls go through Rust (reqwest) to avoid CORS issues.
 * Tokens are stored in the SQLite app_settings table.
 */
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { getSetting, setSetting } from './db';

// ─── OAuth2 Scopes ────────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const REDIRECT_URI = 'http://127.0.0.1:3001/oauth/callback';

// ── Service Account Helpers ──────────────────────────────────────────────────

async function signJWT(jsonKey: any) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: jsonKey.client_email,
    sub: jsonKey.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64Url = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  // Import the PKCS8 private key
  const pem = jsonKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await window.crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(dataToSign)
  );

  const encodedSignature = base64Url(String.fromCharCode(...new Uint8Array(signature)));
  return `${dataToSign}.${encodedSignature}`;
}

export async function connectWithServiceAccount(jsonString: string) {
  try {
    console.log('Attempting Service Account Connection...');
    const jsonKey = JSON.parse(jsonString);
    if (!jsonKey.private_key || !jsonKey.client_email) {
      console.warn('Invalid JSON Key structure:', jsonKey);
      throw new Error('Invalid JSON Key: Missing private_key or client_email.');
    }

    console.log('Signing JWT for:', jsonKey.client_email);
    const jwt = await signJWT(jsonKey);
    console.log('JWT signed, requesting token via Rust...');
    
    const data = await invoke<any>('request_service_account_token', { assertion: jwt });
    console.log('Token response received:', data.error ? 'ERROR' : 'SUCCESS');
    
    if (data.error) throw new Error(data.error_description || data.error);

    await setSetting('googleAccessToken', data.access_token);
    await setSetting('googleTokenExpiry', (Date.now() + 3500 * 1000).toString());
    await setSetting('googleUserEmail', jsonKey.client_email);
    await setSetting('googleUserName', 'Service Account');
    await setSetting('googleServiceAccountKey', jsonString);
    await setSetting('googleRefreshToken', '');
    // Clear Personal OAuth creds to prevent conflicts
    await setSetting('googleClientId', '');
    await setSetting('googleClientSecret', '');

    return { email: jsonKey.client_email, name: 'Service Account' };
  } catch (err: any) {
    console.error('connectWithServiceAccount failed:', err);
    throw new Error(`Service Account Connection Failed: ${err.message}`);
  }
}

// ─── Token Management ─────────────────────────────────────────────────────────

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
}

export async function loadTokens(): Promise<OAuthTokens | null> {
  const accessToken  = await getSetting('googleAccessToken');
  const refreshToken = await getSetting('googleRefreshToken');
  const expiry       = parseInt(await getSetting('googleTokenExpiry') || '0', 10);
  if (!accessToken && !refreshToken) return null;
  return { access_token: accessToken, refresh_token: refreshToken, expiry_date: expiry };
}

export async function saveTokens(tokens: OAuthTokens): Promise<void> {
  if (tokens.access_token)  await setSetting('googleAccessToken',  tokens.access_token);
  if (tokens.refresh_token) await setSetting('googleRefreshToken', tokens.refresh_token);
  const expiry = tokens.expiry_date ?? (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : 0);
  await setSetting('googleTokenExpiry', String(expiry));
}

export async function clearTokens(): Promise<void> {
  await setSetting('googleAccessToken',  '');
  await setSetting('googleRefreshToken', '');
  await setSetting('googleTokenExpiry',  '0');
  await setSetting('googleUserEmail',    '');
  await setSetting('googleUserName',     '');
  await setSetting('googleServiceAccountKey', '');
}

/** Returns a valid access token, refreshing if needed */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await loadTokens();
  if (!tokens) throw new Error('NOT_CONNECTED');

  const fiveMinutes = 5 * 60 * 1000;
  const isExpired = tokens.expiry_date && (tokens.expiry_date - Date.now() < fiveMinutes);

  if (isExpired) {
    const serviceAccountKey = await getSetting('googleServiceAccountKey');
    if (serviceAccountKey) {
      console.log("[Drive] Refreshing Service Account Token...");
      await connectWithServiceAccount(serviceAccountKey);
      return (await getSetting('googleAccessToken')) || '';
    }

    if (tokens.refresh_token) {
      const clientId     = await getSetting('googleClientId') || DEFAULT_CLIENT_ID;
      const clientSecret = await getSetting('googleClientSecret') || DEFAULT_CLIENT_SECRET;
      const refreshed = await invoke<OAuthTokens>('refresh_access_token', {
        refreshToken: tokens.refresh_token,
        clientId,
        clientSecret,
      });
      await saveTokens({ ...tokens, ...refreshed });
      return refreshed.access_token;
    }
  }

  if (!tokens.access_token) throw new Error('NOT_CONNECTED');
  return tokens.access_token;
}

// ─── Auth URL Builder ─────────────────────────────────────────────────────────

export function buildAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: REDIRECT_URI,
    response_type:'code',
    scope:        SCOPES,
    access_type:  'offline',
    prompt:       'select_account consent',  // ensures refresh_token is returned
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ─── Connect Flow ─────────────────────────────────────────────────────────────

/**
 * Full OAuth2 flow:
 * 1. Build consent URL
 * 2. Start local HTTP server (Rust) to catch callback
 * 3. Exchange code for tokens
 * 4. Fetch user info
 * 5. Save everything to SQLite
 */
const DEFAULT_CLIENT_ID = "253339430406-b9ia01hgtlfth5l2ct42gk1fetl8tavq.apps.googleusercontent.com";
const DEFAULT_CLIENT_SECRET = "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";

export async function connectGoogleDrive(
  manualPin?: string,
  directCreds?: { clientId: string; clientSecret: string }
): Promise<{
  email: string;
  name: string;
}> {
  let clientId     = directCreds?.clientId     || await getSetting('googleClientId');
  let clientSecret = directCreds?.clientSecret || await getSetting('googleClientSecret');

  // Fallback to the hardcoded default credentials if not explicitly set
  if (!clientId || !clientSecret) {
    clientId = DEFAULT_CLIENT_ID;
    clientSecret = DEFAULT_CLIENT_SECRET;
  }

  const authUrl = buildAuthUrl(clientId);

  let code = '';
  if (manualPin) {
    // Extract code from pasted URL or pasted raw code
    if (manualPin.includes('code=')) {
      const match = manualPin.match(/code=([^&]+)/);
      if (match && match[1]) {
        code = decodeURIComponent(match[1]);
      } else {
        throw new Error('Invalid OAuth URL or PIN format');
      }
    } else {
      code = manualPin.trim();
    }
  } else {
    // Rust starts local server, opens browser, waits for callback
    code = await invoke<string>('start_oauth_server_and_get_code', { authUrl });
  }

  // Exchange authorization code for tokens
  const tokens = await invoke<OAuthTokens>('exchange_oauth_code', {
    code,
    clientId,
    clientSecret,
  });

  await saveTokens({
    ...tokens,
    expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : 0,
  });

  // Fetch user info
  const userInfo = await invoke<{ email: string; name: string; picture?: string }>(
    'get_drive_user_info',
    { accessToken: tokens.access_token }
  );

  await setSetting('googleUserEmail', userInfo.email ?? '');
  await setSetting('googleUserName',  userInfo.name  ?? '');

  return { email: userInfo.email, name: userInfo.name };
}

// ─── Connection Status ────────────────────────────────────────────────────────

export async function checkConnection(): Promise<{
  connected: boolean;
  email?: string;
  name?: string;
  error?: string;
}> {
  try {
    const accessToken = await getValidAccessToken();
    const userInfo = await invoke<{ email: string; name: string }>(
      'get_drive_user_info',
      { accessToken }
    );
    if (userInfo.email) {
      await setSetting('googleUserEmail', userInfo.email);
      await setSetting('googleUserName',  userInfo.name ?? '');
      return { connected: true, email: userInfo.email, name: userInfo.name };
    }
    return { connected: false, error: 'Authentication failed' };
  } catch (err: any) {
    if (err === 'NOT_CONNECTED' || err?.message === 'NOT_CONNECTED') {
      return { connected: false };
    }
    return { connected: false, error: String(err?.message ?? err) };
  }
}

export async function disconnect(): Promise<void> {
  await clearTokens();
}

// ─── Backup ───────────────────────────────────────────────────────────────────

export async function backupNow(
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Creating backup archive...');
  const zipPath = await invoke<string>('create_backup_zip');

  onProgress?.('Connecting to Google Drive...');
  const accessToken = await getValidAccessToken();

  const fileName = `HRM_Backup_Mobile_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`;

  onProgress?.('Uploading to Google Drive...');
  await invoke('upload_zip_to_drive', { zipPath, accessToken, fileName });

  onProgress?.('Backup complete!');
  return fileName;
}

// ─── List Backups ─────────────────────────────────────────────────────────────

export interface DriveFile {
  id:           string;
  name:         string;
  size?:        string;
  modifiedTime?: string;
  createdTime?: string;
}

export async function listBackups(): Promise<DriveFile[]> {
  const accessToken = await getValidAccessToken();
  return invoke<DriveFile[]>('list_drive_backups', { accessToken });
}

// ─── Delete a single backup ────────────────────────────────────────────────────
export async function deleteBackup(fileId: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  return invoke<void>('delete_drive_file', { fileId, accessToken });
}

// ─── Delete ALL backups (for Master Backup) ────────────────────────────────────
export async function deleteAllBackups(): Promise<void> {
  const files = await listBackups();
  const accessToken = await getValidAccessToken();
  await Promise.all(
    files.map(f => invoke<void>('delete_drive_file', { fileId: f.id, accessToken }))
  );
}

// ─── Restore from Drive ───────────────────────────────────────────────────────

export async function restoreFromDrive(
  fileId: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Downloading backup from Google Drive...');
  const accessToken = await getValidAccessToken();
  const zipPath = await invoke<string>('download_drive_backup', { fileId, accessToken });

  onProgress?.('Restoring database...');
  const { closeDB } = await import('./db');
  await closeDB();
  await new Promise(resolve => setTimeout(resolve, 500));
  await invoke('restore_from_zip', { zipPath });

  onProgress?.('Restore complete — reloading...');
}

// ─── Local Backup (download ZIP without Drive) ────────────────────────────────

export async function downloadLocalBackup(): Promise<string> {
  const zipPath = await invoke<string>('create_backup_zip');
  
  // Mobile Support: Use the Web Share API if available (native on Android WebView)
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const data = await readFile(zipPath);
      const file = new File([data], `HRM_Backup_${new Date().toISOString().slice(0, 10)}.zip`, { type: 'application/zip' });
      
      await (navigator as any).share({
        title: 'HRM Business Backup',
        files: [file],
      });
      return 'Shared successfully';
    } catch (err) {
      console.warn("Share failed, falling back to download:", err);
    }
  }

  try {
    const savePath = await save({
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      defaultPath: `HRM_Backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`
    });

    if (savePath) {
      try {
        console.log("Attempting native copy to:", savePath);
        await invoke('copy_to_path', { src: zipPath, dest: savePath });
        return savePath;
      } catch (copyErr) {
        console.warn("Native copy failed, trying browser-blob fallback:", copyErr);
        // Fallback: Read file and trigger browser download
        try {
          const { readFile } = await import('@tauri-apps/plugin-fs');
          const data = await readFile(zipPath);
          const blob = new Blob([data], { type: 'application/zip' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = savePath.split(/[\\\/]/).pop() || 'backup.zip';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return `DOWNLOADED_VIA_BROWSER: ${savePath}`;
        } catch (fallbackErr) {
          console.error("Browser fallback also failed:", fallbackErr);
          return `INTERNAL_FALLBACK: ${zipPath}`;
        }
      }
    } else {
      throw new Error('Canceled');
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'Canceled') {
      throw err;
    }
    console.error("Save dialog system failure:", err);
    return `INTERNAL_FALLBACK: ${zipPath}`;
  }
}

// ─── Restore from local file ──────────────────────────────────────────────────


export async function restoreFromLocalFile(file: File): Promise<void> {
  // Read file as Uint8Array (Supported natively by Tauri 2.0 binary bridge)
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Use the native Rust command to save the buffer to AppData
  const fullTempPath = await invoke<string>('save_buffer_to_app_data', { 
    filename: 'local_restore_temp.zip', 
    data: uint8 
  });

  const { closeDB } = await import('./db');
  await closeDB();
  // Brief delay to ensure file handles are released
  await new Promise(resolve => setTimeout(resolve, 500));
  await invoke('restore_from_zip', { zipPath: fullTempPath });
}

export async function restoreFromFilePath(zipPath: string): Promise<void> {
  // Check if this is an Android content URI (content://)
  if (zipPath.startsWith('content://')) {
    try {
      // Use Tauri FS readBinaryFile (which handles content:// on Android)
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const data = await readFile(zipPath);
      
      const fullTempPath = await invoke<string>('save_buffer_to_app_data', { 
        filename: 'local_restore_temp.zip', 
        data 
      });
      
      const { closeDB } = await import('./db');
      await closeDB();
      await new Promise(resolve => setTimeout(resolve, 500));
      await invoke('restore_from_zip', { zipPath: fullTempPath });
      return;
    } catch (err) {
      console.warn("Failed to read content URI directly, trying native copy:", err);
    }
  }

  // Bypass plugin-fs specific restrictions using the native Rust copy_root implementation
  let targetPath = '';
  try {
    targetPath = await invoke<string>('copy_file_native', { 
       src: zipPath, 
       destFilename: 'local_restore_temp.zip' 
    });
  } catch (err) {
    console.warn("Native copy failed, possibly due to content URI layout:", err);
    // Ultimate fallback if the user is forced into "Download" vs file picker structure
    const { copyFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    await copyFile(zipPath, 'local_restore_temp.zip', { toPathBaseDir: BaseDirectory.AppData });
    
    const tempPathDir = await invoke<string>('get_app_data_path');
    targetPath = `${tempPathDir}/local_restore_temp.zip`;
  }

  const { closeDB } = await import('./db');
  await closeDB();
  // Brief delay to ensure file handles are released
  await new Promise(resolve => setTimeout(resolve, 500));
  await invoke('restore_from_zip', { zipPath: targetPath });
}

export async function openLocalBackupPicker(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'ZIP Backup', extensions: ['zip'] }],
    title: 'Select Backup File from Storage'
  });
  return selected as string | null;
}
