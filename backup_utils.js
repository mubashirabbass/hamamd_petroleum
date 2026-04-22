/**
 * backup_utils.js
 * ================
 * Complete Google Drive Backup Engine for Mobile Shop POS
 * Handles: OAuth2 Auth, Token Storage, Zip Creation, Upload, Download, Restore
 * Dependencies: googleapis, archiver, extract-zip (all pre-installed)
 */

import { google } from 'googleapis';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createWriteStream, existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const extractZip = require('extract-zip');
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// PATH CONFIGURATION
// Must mirror server.js exactly so backup reads/writes the same
// directory that NeDB writes to — whether dev or packaged.
// ============================================================

const isPackaged = process.env.NODE_ENV === 'production' && __dirname.includes('app.asar');

/**
 * Returns the same stable AppData path used by server.js:
 *   Windows : %APPDATA%/MobileShopPOS/
 *   macOS   : ~/Library/Application Support/MobileShopPOS/
 *   Linux   : ~/.mobileshoppos/
 */
function getAppDataPath() {
    const appName = 'MobileShopPOS';
    if (process.platform === 'win32') {
        return path.join(
            process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
            appName
        );
    } else if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
    }
    return path.join(os.homedir(), `.${appName.toLowerCase()}`);
}

const baseDir = isPackaged ? getAppDataPath() : __dirname;

const DATA_DIR = path.join(baseDir, 'data');
const UPLOADS_DIR = path.join(baseDir, 'uploads');
const TOKENS_FILE = path.join(DATA_DIR, 'google_tokens.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ============================================================
// PROGRESS TRACKER (in-memory, polled by frontend)
// ============================================================

let _progress = {
    status: 'idle',   // idle | zipping | uploading | completed | error | restoring
    progress: 0,
    message: 'Idle',
    error: null
};

export function getProgress() {
    return { ..._progress };
}

export function resetProgress() {
    _progress = { status: 'idle', progress: 0, message: 'Idle', error: null };
}

export function setProgress(status, progress, message, error = null) {
    _progress = { status, progress: Math.round(progress), message, error };
    console.log(`[Backup Progress] [${status}] ${progress}% - ${message}${error ? ' | Error: ' + error : ''}`);
}

// ============================================================
// GOOGLE OAUTH2 HELPERS
// ============================================================

const REDIRECT_URI = 'http://localhost:3001/api/backup/callback';
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Build an OAuth2 client from stored credentials
 */
function buildOAuth2Client(clientId, clientSecret) {
    if (!clientId || !clientSecret) {
        throw new Error('Google Client ID and Secret are required. Please configure them in Settings.');
    }
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Load stored tokens from disk and attach to client
 */
/**
 * Load stored tokens from disk and attach to client
 */
function loadTokens(oAuth2Client) {
    // 1. Always attach the refresh listener so that if Google 
    // auto-refreshes a token during an API call, we save the new one.
    oAuth2Client.on('tokens', (newTokens) => {
        try {
            console.log('[Backup] Received new tokens from Google OAuth2 client.');
            const current = existsSync(TOKENS_FILE)
                ? JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'))
                : {};
            const merged = { ...current, ...newTokens };
            
            // Atomic write using a temporary file to prevent corruption
            const tempFile = TOKENS_FILE + '.tmp';
            writeFileSync(tempFile, JSON.stringify(merged, null, 2));
            fs.renameSync(tempFile, TOKENS_FILE);
            
            console.log('[Backup] Google Drive tokens refreshed and saved atomically to disk.');
        } catch (err) {
            console.error('[Backup] Failed to save refreshed tokens:', err.message);
        }
    });

    // 2. Load existing tokens if they exist
    if (!existsSync(TOKENS_FILE)) {
        console.warn('[Backup] google_tokens.json not found on disk.');
        return false;
    }
    
    try {
        const tokens = JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'));
        if (!tokens.refresh_token) {
            console.warn('[Backup] Loaded tokens are missing a refresh_token. Disconnection likely after 1 hour.');
        }
        oAuth2Client.setCredentials(tokens);

        // Proactive Refresh Check: If token is expired or within 5 mins of expiry, force a refresh now
        const now = Date.now();
        const expiryDate = tokens.expiry_date || 0;
        const fiveMinutes = 5 * 60 * 1000;

        if (expiryDate > 0 && (expiryDate - now < fiveMinutes)) {
            console.log('[Backup] Token near expiry or already expired. Attempting proactive refresh...');
            // We don't await this here to avoid blocking, but the next API call will use the refreshed state
            oAuth2Client.getAccessToken().catch(err => {
                console.warn('[Backup] Proactive token refresh failed:', err.message);
            });
        }

        return true;
    } catch (err) {
        console.error('[Backup] Failed to load or parse stored tokens:', err.message);
        return false;
    }
}

// ============================================================
// PUBLIC API: AUTH
// ============================================================

/**
 * Generate the Google OAuth2 consent URL
 */
export function getAuthUrl(clientId, clientSecret) {
    const oAuth2Client = buildOAuth2Client(clientId, clientSecret);
    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        // 'consent' ensures we get a refresh_token even if the user has 
        // authorized before. This fixes the "disconnect after 1 hour" issue.
        prompt: 'select_account consent',
        scope: SCOPES
    });
}

/**
 * Exchange authorization code for tokens and save to disk
 */
export async function saveTokens(code, clientId, clientSecret) {
    const oAuth2Client = buildOAuth2Client(clientId, clientSecret);
    const { tokens } = await oAuth2Client.getToken(code);
    writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    console.log('[Backup] OAuth2 tokens saved successfully.');
    return tokens;
}

/**
 * Get authenticated Google Drive user info — used to check connection
 */
export async function getDriveUserInfo(clientId, clientSecret) {
    try {
        const oAuth2Client = buildOAuth2Client(clientId, clientSecret);
        const loaded = loadTokens(oAuth2Client);
        if (!loaded) return { error: 'NOT_CONNECTED', message: 'Google Drive is not connected (token file missing).' };

        // Ensure we have a valid token (force refresh if expired)
        try {
            await oAuth2Client.getAccessToken(); 
        } catch (refreshErr) {
            console.error('[Backup] Token refresh failed during userInfo check:', refreshErr.message);
            return { error: 'AUTH_FAILED', message: 'Authentication failed: ' + refreshErr.message };
        }

        const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
        const { data } = await oauth2.userinfo.get();
        return { email: data.email, name: data.name, picture: data.picture };
    } catch (err) {
        console.error('[Backup] getDriveUserInfo error:', err.message);
        return { error: 'UNKNOWN_ERROR', message: err.message };
    }
}

/**
 * Remove stored tokens (disconnect Google Drive)
 */
export function disconnectDrive() {
    try {
        if (existsSync(TOKENS_FILE)) {
            fs.unlinkSync(TOKENS_FILE);
            console.log('[Backup] Google Drive disconnected – tokens deleted.');
        }
        return true;
    } catch (err) {
        console.error('[Backup] Failed to disconnect:', err.message);
        return false;
    }
}

// ============================================================
// PUBLIC API: ZIP (Backup Creation)
// ============================================================

// All DB modules in the current version of the software.
// This list is used both to document what's backed up and to initialize
// missing modules when restoring from an older backup.
const ALL_DB_MODULES = [
    'users', 'inventory', 'sales', 'customers', 'purchases',
    'customer_purchases', 'settings', 'counters', 'expenses',
    'other_shops', 'installments', 'easypaisa'
];

/**
 * Backed-up files include ALL module data and security files:
 * - DATA: users, inventory, sales, customers, purchases, customer_purchases,
 *         settings, counters, expenses, other_shops, installments
 * - META: backup_metadata.json (version manifest for forward compatibility)
 * - ROOT: .license.dat (for application activation)
 * - UPLOADS: All product and customer images
 */
export async function createBackupZip(outputPath) {
    console.log(`[Backup] Source DATA_DIR   : ${DATA_DIR}`);
    console.log(`[Backup] Source UPLOADS_DIR: ${UPLOADS_DIR}`);
    setProgress('zipping', 5, 'Starting comprehensive backup...');

    return new Promise((resolve, reject) => {
        const output = createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`[Backup] ZIP created: ${outputPath} (${sizeMB} MB)`);
            setProgress('zipping', 40, `Archive ready (${sizeMB} MB). Starting upload...`);
            resolve(outputPath);
        });

        archive.on('warning', (err) => {
            if (err.code !== 'ENOENT') reject(err);
            else console.warn('[Backup] Archive warning:', err.message);
        });

        archive.on('error', (err) => {
            setProgress('error', 0, 'Failed to create backup archive', err.message);
            reject(err);
        });

        archive.pipe(output);

        // ── Backup Metadata (version manifest) ────────────────────────────
        // Stored as backup_metadata.json in the zip root so future restore
        // operations know which software version created this backup and
        // which DB modules it includes.
        const metadata = {
            version: '2.0',
            createdAt: new Date().toISOString(),
            modules: ALL_DB_MODULES,
            dbFiles: ALL_DB_MODULES.map(m => `${m === 'customer_purchases' ? 'customer_purchases' : m.replace('_', '_')  }.db`)
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'backup_metadata.json' });
        console.log('[Backup] Wrote backup_metadata.json');

        // ── DATA directory (All Modules) ──────────────────────────────────
        if (existsSync(DATA_DIR)) {
            archive.directory(DATA_DIR, 'data', (entry) => {
                const name = entry.name.toLowerCase();
                const relPath = entry.name; 

                // ABSOLUTE PROTECTION: Exclude any file that is within a subdirectory
                // to prevent zipping locked browser cache/session folders (EBUSY error).
                // We only want the .db files at the ROOT of the data directory.
                if (relPath.includes('/') || relPath.includes('\\')) return false;
                
                // Only include legitimate NeDB database files
                if (!name.endsWith('.db')) return false;

                // Skip temporary clutter or metadata that shouldn't be in the cloud
                if (name.endsWith('.zip') || name.endsWith('.bak')) return false;
                if (name.startsWith('restore_temp_') || name.startsWith('cloud_restore_')) return false;
                if (name === 'google_tokens.json' || name === 'backup_tokens.json') return false;

                console.log(`[Backup] Including: data/${relPath}`);
                return entry;
            });
        } else {
            console.warn('[Backup] DATA_DIR not found:', DATA_DIR);
        }

        // ── ROOT directory (License & Identity) ───────────────────────────
        const rootFiles = ['.license.dat', 'package.json'];
        rootFiles.forEach(file => {
            const fullPath = path.join(process.cwd(), file);
            if (existsSync(fullPath)) {
                archive.file(fullPath, { name: file });
                console.log(`[Backup] Included root file: ${file}`);
            }
        });

        // ── UPLOADS directory (All Images) ────────────────────────────────
        if (existsSync(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, 'uploads', (entry) => {
                if (entry.name.endsWith('.zip')) return false;
                return entry;
            });
        }

        archive.finalize();
    });
}

// ============================================================
// PUBLIC API: GOOGLE DRIVE UPLOAD
// ============================================================

/**
 * Get or create the fixed backup folder on Google Drive.
 *
 * IMPORTANT: We use a FIXED folder name ('Mobile Shop POS/Backups')
 * and NOT the shop name. This guarantees that any installation of
 * this software using the same Google Client ID will always find its
 * backups, regardless of what the shop name is set to on that machine.
 *
 * Folder structure on Google Drive:
 *   📁 Mobile Shop POS
 *     └── 📁 Backups
 *           ├── POS_Backup_2025-01-01_120000.zip
 *           └── ...
 */
async function getOrCreateDriveFolder(drive) {
    const FIXED_PARENT = 'Mobile Shop POS';
    const FIXED_CHILD = 'Backups';

    const getFolderId = async (name, parentId = null) => {
        const escapedName = name.replace(/'/g, "\\'");
        let q = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (parentId) q += ` and '${parentId}' in parents`;

        const res = await drive.files.list({
            q,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
        }

        const createRes = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentId ? [parentId] : []
            },
            fields: 'id'
        });

        console.log(`[Backup] Created Drive folder: ${name} (ID: ${createRes.data.id})`);
        return createRes.data.id;
    };

    const parentFolderId = await getFolderId(FIXED_PARENT);
    const backupFolderId = await getFolderId(FIXED_CHILD, parentFolderId);
    return backupFolderId;
}

/**
 * Upload a ZIP file to Google Drive
 */
export async function uploadToDrive(zipPath, clientId, clientSecret) {
    setProgress('uploading', 45, 'Connecting to Google Drive...');

    const oAuth2Client = buildOAuth2Client(clientId, clientSecret);
    const loaded = loadTokens(oAuth2Client);

    if (!loaded) {
        throw new Error('Google Drive is not connected. Please connect your account in Settings → Backups.');
    }

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    setProgress('uploading', 50, 'Finding backup folder on Drive...');
    const folderId = await getOrCreateDriveFolder(drive);

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, 19);
    const newFileName = `POS_Master_Backup_${timestamp}.zip`;
    const fileSize = fs.statSync(zipPath).size;

    setProgress('uploading', 55, `Checking for existing master backup...`);

    // Search for any file starting with 'POS_Master_Backup' in the folder
    const listRes = await drive.files.list({
        q: `name contains 'POS_Master_Backup' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
    });

    const existingFiles = listRes.data.files || [];

    const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(zipPath)
    };

    let uploadedBytes = 0;
    media.body.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const uploadPercent = Math.min(95, 50 + Math.round((uploadedBytes / fileSize) * 45));
        // Use 1% granularity for a smoother progress bar
        if (true) {
            const mbSent = (uploadedBytes / 1024 / 1024).toFixed(2);
            const totalMb = (fileSize / 1024 / 1024).toFixed(2);
            setProgress('uploading', uploadPercent, `Uploading: ${mbSent} MB / ${totalMb} MB sent`);
        }
    });

    let response;
    if (existingFiles.length > 0) {
        // UPDATE and RENAME existing file
        const fileId = existingFiles[0].id;
        setProgress('uploading', 60, `Syncing to existing record: ${newFileName}...`);
        response = await drive.files.update({
            fileId: fileId,
            requestBody: {
                name: newFileName // Rename it to the current time
            },
            media,
            fields: 'id, name, size, createdTime'
        });
        console.log(`[Backup] Update & Rename successful. ID: ${fileId}`);
    } else {
        // CREATE new file
        setProgress('uploading', 60, `Creating master backup: ${newFileName}...`);
        response = await drive.files.create({
            requestBody: {
                name: newFileName,
                parents: [folderId]
            },
            media,
            fields: 'id, name, size, createdTime'
        });
        console.log(`[Backup] Creation successful. ID: ${response.data.id}`);
    }

    setProgress('completed', 100, `Backup complete! Synced as: ${newFileName}`);

    return response.data;
}

/**
 * Delete old backups, keeping only the N most recent
 */
async function pruneOldBackups(drive, folderId, keepCount = 10) {
    const listRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        spaces: 'drive'
    });

    const files = listRes.data.files || [];
    if (files.length <= keepCount) return;

    const toDelete = files.slice(keepCount);
    for (const file of toDelete) {
        await drive.files.delete({ fileId: file.id });
        console.log(`[Backup] Pruned old backup: ${file.name}`);
    }
}

// ============================================================
// PUBLIC API: LIST CLOUD BACKUPS
// ============================================================

/**
 * List all backup files from Google Drive.
 * Uses the fixed folder — no shop name needed — so any installation
 * with the same Google credentials can always find all backups.
 */
export async function listBackupsFromDrive(clientId, clientSecret) {
    const oAuth2Client = buildOAuth2Client(clientId, clientSecret);
    const loaded = loadTokens(oAuth2Client);

    if (!loaded) {
        throw new Error('Google Drive not connected.');
    }

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const folderId = await getOrCreateDriveFolder(drive);

    const listRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, modifiedTime, createdTime)',
        orderBy: 'modifiedTime desc',
        spaces: 'drive',
        pageSize: 20
    });

    return listRes.data.files || [];
}

// ============================================================
// PUBLIC API: DOWNLOAD FROM DRIVE
// ============================================================

/**
 * Download a specific backup file from Google Drive to local disk
 */
export async function downloadFromDrive(fileId, destPath, clientId, clientSecret) {
    setProgress('restoring', 10, 'Connecting to Google Drive for download...');

    const oAuth2Client = buildOAuth2Client(clientId, clientSecret);
    const loaded = loadTokens(oAuth2Client);

    if (!loaded) {
        throw new Error('Google Drive not connected.');
    }

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    setProgress('restoring', 20, 'Downloading backup file...');

    const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    // Get file size for real progress percentage (may not always be available)
    let fileSize = 0;
    try {
        const meta = await drive.files.get({ fileId, fields: 'size' });
        fileSize = parseInt(meta.data.size || '0', 10);
    } catch (_) {}

    const dest = createWriteStream(destPath);

    return new Promise((resolve, reject) => {
        let downloaded = 0;
        response.data
            .on('data', (chunk) => {
                downloaded += chunk.length;
                let downloadPercent;
                if (fileSize > 0) {
                    // Real percentage based on actual file size
                    downloadPercent = Math.min(55, 20 + Math.round((downloaded / fileSize) * 35));
                } else {
                    // Fallback: increment slowly based on bytes received
                    downloadPercent = Math.min(55, 20 + Math.round(downloaded / 1024 / 200));
                }
                const mbDone = (downloaded / 1024 / 1024).toFixed(1);
                const mbTotal = fileSize > 0 ? ` / ${(fileSize / 1024 / 1024).toFixed(1)} MB` : ' MB';
                setProgress('restoring', downloadPercent, `Downloading: ${mbDone}${mbTotal}...`);
            })
            .on('end', () => {
                dest.end(() => {
                    setProgress('restoring', 58, 'Download complete. Preparing to restore...');
                    resolve(destPath);
                });
            })
            .on('error', (err) => {
                setProgress('error', 0, 'Download failed', err.message);
                reject(err);
            })
            .pipe(dest);
    });
}

// ============================================================
// PUBLIC API: RESTORE
// ============================================================

/**
 * Restore data from a local zip file (overwrites current data)
 */
export async function restoreFromBackup(zipPath) {
    let extractInterval = null;
    const tempDirName = `res_${Date.now().toString().slice(-6)}`;
    const tempExtractDir = path.join(os.tmpdir(), tempDirName);

    try {
        console.log(`\n📂 [Restore] STARTING RESTORE FROM: ${zipPath}`);
        setProgress('restoring', 60, 'Initializing extraction...');

        if (!existsSync(zipPath)) {
            throw new Error(`Backup file not found: ${zipPath}`);
        }

        // 1. Create temporary extraction target
        if (existsSync(tempExtractDir)) {
            try { deleteDirSync(tempExtractDir); } catch (e) {}
        }
        mkdirSync(tempExtractDir, { recursive: true });

        // 2. Extract zip with animated progress ticks
        let extractTick = 60;
        extractInterval = setInterval(() => {
            if (extractTick < 72) {
                extractTick += 1;
                console.log(`   [Restore] Extracting... ${extractTick}%`);
                setProgress('restoring', extractTick, 'Extracting backup archive...');
            }
        }, 1500); 

        const EXTRACT_TIMEOUT_MS = 5 * 60 * 1000; 
        console.log('   [Restore] Calling extractZip...');
        
        await Promise.race([
            extractZip(zipPath, { dir: tempExtractDir }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Extraction timed out after 5 minutes.')), EXTRACT_TIMEOUT_MS)
            )
        ]);

        if (extractInterval) clearInterval(extractInterval);
        console.log('   [Restore] Extraction complete.');
        setProgress('restoring', 75, 'Archive extracted. Replacing data files...');

        // 3. Robust Data Discovery: Search for all .db files anywhere in the extracted tree
        console.log('   [Restore] Searching for database files in archive...');
        const allExtractedFiles = getAllFiles(tempExtractDir);
        const dbFilesMap = new Map(); // name.toLowerCase() -> fullPath

        allExtractedFiles.forEach(f => {
            if (f.toLowerCase().endsWith('.db')) {
                const baseName = path.basename(f).toLowerCase();
                // Map it: if multiple versions exist (older backups sometimes had copies), 
                // prioritize the one in a 'data/' folder or the one with the shortest path.
                if (!dbFilesMap.has(baseName) || f.includes('/data/') || f.includes('\\data\\')) {
                    dbFilesMap.set(baseName, f);
                }
            }
        });

        // 4. Restore Database Files
        const targetModules = [
            'users', 'inventory', 'sales', 'customers', 'purchases',
            'customer_purchases', 'settings', 'counters', 'expenses',
            'other_shops', 'installments', 'easypaisa'
        ].map(m => m + '.db');

        console.log(`   [Restore] Found ${dbFilesMap.size} potential DB files. Mapping to ${targetModules.length} modern modules...`);

        let restoredCount = 0;
        for (const target of targetModules) {
            const src = dbFilesMap.get(target);
            const dest = path.join(DATA_DIR, target);

            if (src) {
                try {
                    copyFileSyncForce(src, dest);
                    restoredCount++;
                    console.log(`      [DB] Restored: ${target} (Found at: ${path.relative(tempExtractDir, src)})`);
                } catch (err) {
                    console.error(`      [DB] FAILED: ${target} | Error: ${err.message}`);
                    if (target === 'settings.db' || target === 'users.db') throw err;
                }
            } else {
                console.warn(`      [DB] MISSING: ${target} (Not in backup — will initialize as empty)`);
            }
        }

        // 5. Restore Uploads (Search for any 'uploads' directory in the extracted tree)
        const uploadsDirs = allExtractedFiles
            .filter(f => f.toLowerCase().includes('/uploads/') || f.toLowerCase().includes('\\uploads\\'))
            .map(f => {
                const parts = f.includes('/uploads/') ? f.split('/uploads/') : f.split('\\uploads\\');
                return path.join(parts[0], 'uploads');
            });
        
        const uniqueUploadsDirs = [...new Set(uploadsDirs)];
        if (uniqueUploadsDirs.length > 0) {
            setProgress('restoring', 88, 'Restoring images...');
            // Take the one with the most files or the standard one
            const bestUploadsDir = uniqueUploadsDirs[0]; 
            console.log(`   [Restore] Restoring uploads from: ${path.relative(tempExtractDir, bestUploadsDir)}`);
            copyDirSync(bestUploadsDir, UPLOADS_DIR);
            console.log('   [Restore] Uploads restored.');
        } else {
            console.warn('   [Restore] No uploads directory found in backup.');
        }

        // 6. Ensure modern modules exist (Initialization)
        // We only write an empty file if the module was NEITHER in the backup NOR already on disk.
        targetModules.forEach(m => {
            const p = path.join(DATA_DIR, m);
            if (!existsSync(p)) {
                console.log(`   [Restore] Initializing missing module: ${m}`);
                writeFileSync(p, '');
            }
        });

        console.log('✅ [Restore] COMPLETE.');
        setProgress('completed', 100, 'Restore successful!');

    } catch (err) {
        console.error('❌ [Restore] FATAL ERROR:', err);
        setProgress('error', 0, 'Restore failed: ' + err.message);
        throw err;
    } finally {
        if (extractInterval) clearInterval(extractInterval);
        try {
            if (existsSync(tempExtractDir)) deleteDirSync(tempExtractDir);
        } catch (e) {
            console.warn('   [Restore] Cleanup failed (non-fatal):', e.message);
        }
    }
}

// ============================================================
// PUBLIC API: INTERNET CHECK
// ============================================================

/**
 * Check if internet is available
 */
export function isInternetConnected() {
    return new Promise((resolve) => {
        const req = https.request(
            { hostname: 'www.googleapis.com', port: 443, path: '/', method: 'HEAD', timeout: 5000 },
            (res) => resolve(res.statusCode < 500)
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });
}

// ============================================================
// UTILITY HELPERS
// ============================================================

/**
 * Forcefully copy a file, handling Windows locks
 */
function copyFileSyncForce(src, dest) {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

            if (fs.existsSync(dest)) {
                try { fs.chmodSync(dest, 0o666); } catch (e) {}
            }

            fs.copyFileSync(src, dest);
            return;
        } catch (err) {
            attempt++;
            const isLockError = ['EPERM', 'EBUSY', 'EACCES'].includes(err.code);
            if (isLockError && attempt < maxRetries) {
                if (attempt === 1) {
                    try {
                        const tempOld = dest + '.old';
                        if (fs.existsSync(tempOld)) fs.unlinkSync(tempOld);
                        fs.renameSync(dest, tempOld);
                        fs.copyFileSync(src, dest);
                        return;
                    } catch (e) {}
                }
                const waitTil = Date.now() + (400 * attempt);
                while (Date.now() < waitTil) {}
            } else {
                throw err;
            }
        }
    }
    throw new Error(`Failed to copy to ${dest} after ${maxRetries} attempts.`);
}

/**
 * Recursively copy a directory
 */
function copyDirSync(src, dest) {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            copyFileSyncForce(srcPath, destPath);
        }
    }
}

/**
 * Recursively delete a directory
 */
function deleteDirSync(dirPath) {
    if (!existsSync(dirPath)) return;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                deleteDirSync(fullPath);
            } else {
                try {
                    fs.chmodSync(fullPath, 0o666);
                    fs.unlinkSync(fullPath);
                } catch (e) {}
            }
        }
        fs.rmdirSync(dirPath);
    } catch (err) {
        console.warn(`[Cleanup] Failed for ${dirPath}:`, err.message);
    }
}
/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

/**
 * Prune old local backups
 */
function pruneLocalBackups(dir, keep) {
    if (!existsSync(dir)) return;
    const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.zip'))
        .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    if (files.length <= keep) return;
    files.slice(keep).forEach(f => {
        try { fs.unlinkSync(path.join(dir, f.name)); } catch (e) {}
    });
}
