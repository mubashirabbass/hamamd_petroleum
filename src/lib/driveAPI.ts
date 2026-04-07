/**
 * driveAPI.ts — Google Drive Backup API (Tauri Command Wrappers)
 * ==============================================================
 * All Google API calls go through Rust (reqwest) to avoid CORS issues.
 * Tokens are stored in the SQLite app_settings table.
 */
import { invoke } from '@tauri-apps/api/core';
import { getSetting, setSetting } from './db';

// ─── OAuth2 Scopes ────────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const REDIRECT_URI = 'http://localhost:3001/oauth/callback';

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
}

/** Returns a valid access token, refreshing if needed */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await loadTokens();
  if (!tokens) throw new Error('NOT_CONNECTED');

  const fiveMinutes = 5 * 60 * 1000;
  const isExpired = tokens.expiry_date && (tokens.expiry_date - Date.now() < fiveMinutes);

  if (isExpired && tokens.refresh_token) {
    const clientId     = await getSetting('googleClientId');
    const clientSecret = await getSetting('googleClientSecret');
    const refreshed = await invoke<OAuthTokens>('refresh_access_token', {
      refreshToken: tokens.refresh_token,
      clientId,
      clientSecret,
    });
    await saveTokens({ ...tokens, ...refreshed });
    return refreshed.access_token;
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
export async function connectGoogleDrive(): Promise<{
  email: string;
  name: string;
}> {
  const clientId     = await getSetting('googleClientId');
  const clientSecret = await getSetting('googleClientSecret');

  if (!clientId || !clientSecret) {
    throw new Error('Google Client ID and Secret are not configured. Please enter them below.');
  }

  const authUrl = buildAuthUrl(clientId);

  // Rust starts local server, opens browser, waits for callback
  const code = await invoke<string>('start_oauth_server_and_get_code', { authUrl });

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

  const fileName = `EBS_Backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`;

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
  await invoke('restore_from_zip', { zipPath });

  onProgress?.('Restore complete — reloading...');
}

// ─── Local Backup (download ZIP without Drive) ────────────────────────────────

export async function downloadLocalBackup(): Promise<string> {
  return invoke<string>('create_backup_zip');
}

// ─── Restore from local file ──────────────────────────────────────────────────

export async function restoreFromLocalFile(file: File): Promise<void> {
  // Write the file to a temp path, then restore
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Use Tauri FS to write temp file, then restore
  // We'll write it via a blob URL approach with invoke
  const tempPath = await invoke<string>('get_app_data_path');
  const fullTempPath = `${tempPath}\\local_restore_temp.zip`;

  // Write via Rust (encodes binary data as base64)
  await invoke('write_binary_file', {
    path: fullTempPath,
    data: Array.from(uint8),
  }).catch(async () => {
    // Fallback: use plugin-fs if write_binary_file isn't registered
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(fullTempPath, uint8);
  });

  const { closeDB } = await import('./db');
  await closeDB();
  await invoke('restore_from_zip', { zipPath: fullTempPath });
}
