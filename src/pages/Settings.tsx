import { useState, useEffect, useRef } from 'react';
import {
  Settings, ShieldCheck, AlertCircle, Calendar, UserCog,
  Cloud, RefreshCcw, Save, HardDrive, CloudOff,
  Download, Upload, Trash2, Eye, EyeOff,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import ManageUsersModal from '../components/modals/ManageUsersModal';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import DeveloperSettings from '../components/settings/DeveloperSettings';
import KeyboardShortcutsPanel from '../components/settings/KeyboardShortcutsPanel';
import { Terminal, Keyboard as KeyboardIcon } from 'lucide-react';
import { getSetting, setSetting } from '../lib/db';
import {
  checkConnection,
  connectGoogleDrive,
  disconnect,
  backupNow,
  listBackups,
  restoreFromDrive,
  downloadLocalBackup,
  type DriveFile,
} from '../lib/driveAPI';
import { invoke } from '@tauri-apps/api/core';

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function BackupPanel() {
  const { toast } = useToast();

  // ── Credentials ────────────────────────────────────────────────────────────
  const [clientId,     setClientId]     = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret,   setShowSecret]   = useState(false);
  const [savingCreds,  setSavingCreds]  = useState(false);
  const [credsSaved,   setCredsSaved]   = useState(false);

  // ── Connection ─────────────────────────────────────────────────────────────
  const [connected,      setConnected]      = useState(false);
  const [driveEmail,     setDriveEmail]     = useState('');
  const [driveName,      setDriveName]      = useState('');
  const [connecting,     setConnecting]     = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // ── Backup / Restore ───────────────────────────────────────────────────────
  const [backupList,    setBackupList]    = useState<DriveFile[]>([]);
  const [loadingList,   setLoadingList]   = useState(false);
  const [progress,      setProgress]      = useState<{ msg: string; active: boolean }>({ msg: '', active: false });
  const _driveName = driveName; void _driveName; // suppress unused warning — reserved for future UI
  const [confirmRestore, setConfirmRestore] = useState<DriveFile | null>(null);
  const [confirmLocalRestore, setConfirmLocalRestore] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load saved credentials & check connection ──────────────────────────────
  useEffect(() => {
    (async () => {
      const id  = await getSetting('googleClientId');
      const sec = await getSetting('googleClientSecret');
      if (id)  { setClientId(id);   setCredsSaved(true); }
      if (sec) { setClientSecret(sec); }

      if (id && sec) {
        const status = await checkConnection();
        if (status.connected) {
          setConnected(true);
          setDriveEmail(status.email ?? '');
          setDriveName(status.name   ?? '');
          await fetchList();
        }
      }
      setCheckingStatus(false);
    })();
  }, []);

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const files = await listBackups();
      setBackupList(files);
    } catch (_) { /* not connected yet */ }
    finally     { setLoadingList(false); }
  };

  // ── Save credentials then immediately open OAuth ──────────────────────────
  const handleConnectWithCreds = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast('Please enter both Client ID and Client Secret.', 'error');
      return;
    }
    setSavingCreds(true);
    await setSetting('googleClientId',     clientId.trim());
    await setSetting('googleClientSecret', clientSecret.trim());
    setCredsSaved(true);
    setSavingCreds(false);
    // Immediately trigger OAuth — no second button needed
    setConnecting(true);
    try {
      const info = await connectGoogleDrive();
      setConnected(true);
      setDriveEmail(info.email);
      setDriveName(info.name);
      toast(`✅ Connected as ${info.name} (${info.email})`, 'success');
      await fetchList();
    } catch (err: any) {
      toast(String(err?.message ?? err), 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleChangeCreds = async () => {
    await setSetting('googleClientId',     '');
    await setSetting('googleClientSecret', '');
    setCredsSaved(false);
    setConnected(false);
    setDriveEmail('');
    setClientId('');
    setClientSecret('');
    setBackupList([]);
  };


  const handleDisconnect = async () => {
    await disconnect();
    setConnected(false);
    setDriveEmail('');
    setDriveName('');
    setBackupList([]);
    toast('Google Drive disconnected.', 'success');
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    const status = await checkConnection();
    if (status.connected) {
      setConnected(true);
      setDriveEmail(status.email ?? '');
      setDriveName(status.name   ?? '');
      await fetchList();
      toast('Google Drive is connected!', 'success');
    } else {
      setConnected(false);
      toast(status.error ?? 'Not connected.', 'error');
    }
    setCheckingStatus(false);
  };

  // ── Backup Now ─────────────────────────────────────────────────────────────
  const handleBackupNow = async () => {
    setProgress({ msg: 'Starting backup…', active: true });
    try {
      const name = await backupNow((msg) => setProgress({ msg, active: true }));
      toast(`✅ Cloud Sync Complete: ${name}`, 'success');
      await fetchList();
    } catch (err: any) {
      toast(`Backup failed: ${err?.message ?? err}`, 'error');
    } finally {
      setProgress({ msg: '', active: false });
    }
  };

  // ── Local ZIP Download ─────────────────────────────────────────────────────
  const handleLocalBackup = async () => {
    setProgress({ msg: 'Creating local backup ZIP…', active: true });
    try {
      const zipPath = await downloadLocalBackup();
      
      // If the path doesn't contain 'AppData', we successfully saved it to the user's location via dialog
      if (!zipPath.includes('AppData')) {
        toast(`Local backup saved to:\n${zipPath}`, 'success');
        return;
      }

      // Fallback: Open the folder so the user can find the file
      try {
        const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
        await revealItemInDir(zipPath);
      } catch (_) { /* folder open is best-effort */ }
      toast(`Local backup saved to:\n${zipPath}`, 'success');
    } catch (err: any) {
      if (err instanceof Error && err.message === 'Canceled') {
        toast('Backup was canceled.', 'error');
      } else {
        toast(`Local backup failed: ${err?.message ?? err}`, 'error');
      }
    } finally {
      setProgress({ msg: '', active: false });
    }
  };

  // ── Cloud Restore ──────────────────────────────────────────────────────────
  const handleCloudRestore = async (file: DriveFile) => {
    setConfirmRestore(null);
    setProgress({ msg: 'Downloading from Google Drive…', active: true });
    try {
      await restoreFromDrive(file.id, (msg) => setProgress({ msg, active: true }));
      toast('Restore complete! Reloading app…', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast(`Restore failed: ${err?.message ?? err}`, 'error');
      setProgress({ msg: '', active: false });
    }
  };

  // ── Local Restore (file upload) ────────────────────────────────────────────
  const handleLocalFile = async (file: File) => {
    setConfirmLocalRestore(file);
  };

  const handleLocalRestore = async (file: File) => {
    setConfirmLocalRestore(null);
    setProgress({ msg: 'Reading backup file…', active: true });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = Array.from(new Uint8Array(arrayBuffer));
      // Write file via Tauri then restore
      const appDir = await invoke<string>('get_app_data_path');
      const tempPath = `${appDir}\\local_restore_temp.zip`;
      // Use tauri-plugin-fs to write the binary
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(tempPath, new Uint8Array(uint8));
      setProgress({ msg: 'Restoring database…', active: true });
      const { closeDB } = await import('../lib/db');
      await closeDB();
      // Release file handlers before replacing the DB
      await new Promise(resolve => setTimeout(resolve, 500));
      await invoke('restore_from_zip', { zipPath: tempPath });
      toast('Restore complete! Reloading app…', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast(`Restore failed: ${err?.message ?? err}`, 'error');
      setProgress({ msg: '', active: false });
    }
  };


  return (
    <div className="space-y-6 h-full overflow-auto pb-6">

      {/* ── Global Progress Banner ──────────────────────────────────────────── */}
      {progress.active && (
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-4 flex items-center gap-4">
          <RefreshCcw className="w-5 h-5 text-primary-400 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-2">{progress.msg}</p>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Initial Loading Overlay ────────────────────────────────────────── */}
      {checkingStatus && !connected && (
        <div className="bg-white/50 dark:bg-dark-950/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-dark-700 p-12 flex flex-col items-center justify-center text-center animate-pulse">
           <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mb-6 border border-primary-500/20">
             <RefreshCcw className="w-10 h-10 text-primary-500 animate-spin" />
           </div>
           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Syncing Account Status</h3>
           <p className="text-sm text-slate-500 dark:text-dark-400 mt-2 font-black uppercase tracking-[0.2em]">Please Wait...</p>
        </div>
      )}

      {/* ── Connection Status Banner ────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl border p-5 flex items-center justify-between gap-4',
        connected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary-500/5 border-primary-500/10'
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shrink-0',
            connected ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-primary-600 shadow-primary-500/30'
          )}>
            {connected ? <Cloud className="w-7 h-7 text-white" /> : <CloudOff className="w-7 h-7 text-white" />}
          </div>
          <div>
            <h3 className={cn('font-black text-lg', connected ? 'text-emerald-400' : 'text-white')}>
              {connected ? 'Cloud Backup Connected' : 'Cloud Backup'}
            </h3>
            {connected ? (
              <div className="flex flex-col gap-1 mt-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-base text-emerald-600 dark:text-emerald-400 font-black tracking-tight">{driveEmail}</span>
                </div>
                {driveName && (
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] pl-4 flex items-center gap-2 opacity-70">
                    <UserCog className="w-3 h-3" /> {driveName}
                  </p>
                )}
              </div>
            ) : checkingStatus ? (
              <p className="text-sm text-slate-500 mt-0.5 animate-pulse">Checking connection…</p>
            ) : (
              <p className="text-sm text-slate-500 mt-0.5">Enter your credentials below to connect Google Drive.</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {connected ? (
            <>
              <button onClick={handleCheckStatus} disabled={checkingStatus}
                className="px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors">
                Refresh
              </button>
              <button onClick={handleDisconnect}
                className="px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
                Disconnect
              </button>
            </>
          ) : (
            <button onClick={handleCheckStatus} disabled={checkingStatus}
              className="px-4 py-2 text-xs font-black bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
              {checkingStatus ? 'Checking…' : 'Check Status'}
            </button>
          )}
        </div>
      </div>

      {/* ── Credential Entry + Connect (hidden when connected) ────────────────── */}
      {!connected && !checkingStatus && (
        <div className="glass rounded-2xl border border-slate-200/50 dark:border-dark-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-dark-700/50 flex items-center justify-between">
            <h4 className="font-black text-slate-900 dark:text-white text-sm">Connect Google Drive Backup</h4>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
              className="text-[11px] text-primary-400 font-bold underline hover:text-primary-300">
              Get Credentials ↗
            </a>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500 dark:text-dark-400">
              Enter your Google OAuth 2.0 credentials. The app will automatically sign in and fetch your account name.
              Set the redirect URI to{' '}
              <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-dark-800 rounded text-primary-400 font-mono text-[11px]">
                http://localhost:3001/oauth/callback
              </code>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-dark-400 mb-1 uppercase tracking-wider">Client ID</label>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
                  placeholder="1234567890-abc...apps.googleusercontent.com"
                  className="input w-full !font-mono !text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-dark-400 mb-1 uppercase tracking-wider">Client Secret</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)} placeholder="GOCSPX-…"
                    className="input w-full !font-mono !text-xs pr-9" />
                  <button type="button" onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleConnectWithCreds}
              disabled={savingCreds || connecting || !clientId.trim() || !clientSecret.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-800 dark:text-white rounded-xl text-sm font-black hover:bg-slate-50 dark:hover:bg-dark-700 transition-all shadow-md active:scale-95 disabled:opacity-40"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {connecting ? 'Opening Google Sign-In…' : savingCreds ? 'Saving…' : 'Sign in with Google'}
            </button>
            {credsSaved && !connected && (
              <button onClick={handleChangeCreds} className="text-xs text-red-400 hover:text-red-500 font-bold transition-colors">
                Clear saved credentials
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Backup Engine (shown when connected) ─────────────────────────────── */}
      {connected && (
        <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Backup Engine</h4>
            <span className="text-xs text-slate-500 font-mono">📁 EBS Petroleum / Backups</span>
          </div>
          <div className="p-6 flex gap-3">
            <button onClick={handleBackupNow} disabled={progress.active}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all',
                progress.active
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                  : 'bg-white text-slate-900 hover:bg-blue-50 shadow-lg active:scale-95'
              )}>
              <RefreshCcw className={cn('w-4 h-4', progress.active && 'animate-spin')} />
              {progress.active ? 'Working…' : 'Backup Now to Drive'}
            </button>
            <button onClick={handleLocalBackup} disabled={progress.active}
              title="Save a local ZIP backup"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-xs font-black active:scale-90 disabled:opacity-40">
              <HardDrive className="w-4 h-4" /> Local ZIP
            </button>
            <button
               onClick={async () => {
                 try {
                   const appDir = await invoke<string>('get_app_data_path');
                   const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
                   // Create folder if missing before opening
                   const { mkdir } = await import('@tauri-apps/plugin-fs');
                   try { await mkdir(`${appDir}\\backups`, { recursive: true }); } catch(_) {}
                   await revealItemInDir(`${appDir}\\backups`);
                 } catch (err: any) {
                   toast('Could not open folder', 'error');
                 }
               }}
               className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
            >
              Open Backup Folder ↗
            </button>
          </div>
          
          {/* Recovery Tips */}
          <div className="mx-6 mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-300/80 leading-relaxed">
            <p className="font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> Manual Data Recovery
            </p>
            Your backups are standard <b>ZIP</b> files containing a <b>SQLite database</b>. Even without this software, you can open the <code>ebs_business.db</code> file using free tools like <i>"DB Browser for SQLite"</i> to view or export your data to Excel.
          </div>
        </div>
      )}

      {/* ── Cloud Backup List ────────────────────────────────────────────────── */}
      {connected && (
        <div className="glass rounded-2xl border border-slate-200/50 dark:border-dark-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-dark-700/50 flex items-center justify-between">
            <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Cloud className="w-4 h-4 text-primary-500" />
              Cloud Backups on Google Drive
              {backupList.length > 0 && (
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-black rounded-full">
                  {backupList.length}
                </span>
              )}
            </h4>
            <button onClick={fetchList} disabled={loadingList}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:text-primary-400 uppercase tracking-wider">
              <RefreshCcw className={cn('w-3 h-3', loadingList && 'animate-spin')} />
              {loadingList ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="max-h-64 overflow-auto divide-y divide-slate-100 dark:divide-dark-700/50">
            {backupList.length > 0 ? backupList.map((bk, i) => (
              <div key={bk.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-primary-50/30 dark:hover:bg-primary-900/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black',
                    i === 0 ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                            : 'bg-slate-100 dark:bg-dark-800 text-slate-500'
                  )}>
                    {bk.name.includes('_Desktop') ? '💻' : bk.name.includes('_Mobile') ? '📱' : (i === 0 ? '★' : i + 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-black text-slate-900 dark:text-white">{bk.name}</p>
                       {bk.name.includes('_Desktop') && (
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded uppercase">Desktop</span>
                      )}
                      {bk.name.includes('_Mobile') && (
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[9px] font-black rounded uppercase">Mobile</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {bk.size && <span>{(parseInt(bk.size) / 1024).toFixed(0)} KB</span>}
                      {bk.size && <span>•</span>}
                      <span>{new Date(bk.modifiedTime ?? bk.createdTime ?? '').toLocaleString()}</span>
                      {i === 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black rounded text-[10px]">
                          Latest Cloud Sync
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmRestore(bk)}
                  disabled={progress.active}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-black hover:bg-primary-700 shadow-md disabled:opacity-40">
                  <Download className="w-3 h-3" /> Restore
                </button>
              </div>
            )) : (
              <div className="py-12 text-center">
                <Cloud className="w-12 h-12 text-slate-200 dark:text-dark-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-dark-400 font-medium">
                  {loadingList ? 'Fetching backups from Google Drive…'
                    : 'No backups yet. Click "Backup Now" to create your first one.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Local Backup / Restore ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Local Download */}
        <div className="glass rounded-2xl border border-slate-200/50 dark:border-dark-700/50 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Download Local Backup</h4>
              <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">Save a ZIP file of all data to your PC.</p>
            </div>
          </div>
          <button onClick={handleLocalBackup} disabled={progress.active}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-40">
            <Save className="w-4 h-4" /> Download ZIP
          </button>
        </div>

        {/* Local Restore */}
        <div className="glass rounded-2xl border border-slate-200/50 dark:border-dark-700/50 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm">Restore from File</h4>
              <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">Restore from a local backup ZIP file.</p>
            </div>
          </div>
          <label className={cn(
            'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-colors shadow-sm cursor-pointer text-center',
            progress.active ? 'bg-amber-200 text-amber-400 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'
          )}>
            <input ref={fileInputRef} type="file" accept=".zip" className="hidden" disabled={progress.active}
              onChange={e => { const f = e.target.files?.[0]; if (f) { handleLocalFile(f); e.target.value = ''; } }} />
            <Upload className="w-4 h-4" /> Select ZIP & Restore
          </label>
        </div>
      </div>

      {/* ── Premium Processing Overlay ────────────────────────────────────────── */}
      {progress.active && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-24 h-24 border-t-4 border-r-4 border-primary-500 rounded-full animate-spin shadow-2xl shadow-primary-500/20" />
              <Cloud className="absolute inset-0 m-auto w-10 h-10 text-white animate-bounce" />
           </div>
           
           <div className="text-center max-w-sm">
             <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">System Processing</h2>
             <p className="text-primary-400 font-bold text-sm mb-6 animate-pulse uppercase tracking-[0.3em]">{progress.msg}</p>
             
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">
                  Please do not close the software. We are securing your business data across the cloud.
                </p>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-primary-500 w-1/3 animate-[loading_2s_infinite]" />
                </div>
             </div>
           </div>
        </div>
      )}

      {/* ── Cloud Restore Confirmation Modal ─────────────────────────────────── */}
      {confirmRestore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmRestore(null)}>
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">Restore From Drive?</h3>
            <p className="text-sm text-slate-600 dark:text-dark-400 text-center mt-2">
              This will <span className="font-black text-red-600">overwrite ALL current data</span> with:
            </p>
            <p className="text-xs text-center font-mono bg-slate-100 dark:bg-dark-800 px-3 py-2 rounded-lg text-slate-700 dark:text-dark-200 mt-3 mb-5 break-all">
              {confirmRestore.name}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestore(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-dark-700 rounded-xl text-sm font-bold text-slate-700 dark:text-dark-200 hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleCloudRestore(confirmRestore)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-colors">
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Local Restore Confirmation Modal ─────────────────────────────────── */}
      {confirmLocalRestore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmLocalRestore(null)}>
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">Restore From File?</h3>
            <p className="text-sm text-slate-600 dark:text-dark-400 text-center mt-2">
              This will <span className="font-black text-red-600">replace ALL current data</span> with the backup:
            </p>
            <p className="text-xs text-center font-mono bg-slate-100 dark:bg-dark-800 px-3 py-2 rounded-lg text-slate-700 dark:text-dark-200 mt-3 mb-5 break-all">
              {confirmLocalRestore.name}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLocalRestore(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-dark-700 rounded-xl text-sm font-bold text-slate-700 dark:text-dark-200 hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleLocalRestore(confirmLocalRestore)}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-black hover:bg-amber-700 transition-colors">
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSettings, currentUser, resetAllData } = useStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'backup' | 'developer' | 'danger' | 'shortcuts'>('general');
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Staff can now access Settings but with restricted tabs
  const isStaff = currentUser?.role === 'Staff';

  const handleUpdateStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    updateSettings({ startDate: date });
    toast(`Software start date set to ${date}`, 'success');
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    await resetAllData();
    toast('All business data has been reset.', 'success');
  };

  const tabs = [
    ...(isStaff ? [] : [
      { id: 'general', label: 'General Setup',    icon: Settings,    color: 'bg-primary-600',  text: 'text-primary-600' },
      { id: 'shortcuts', label: 'Quick Shortcuts', icon: KeyboardIcon, color: 'bg-amber-500',   text: 'text-amber-500'   },
    ]),
    { id: 'backup',  label: 'Backup & Restore',  icon: Cloud,       color: 'bg-blue-600',     text: 'text-blue-600'    },
    ...(isStaff ? [] : [
      { id: 'users',   label: 'User Management',   icon: ShieldCheck, color: 'bg-emerald-600',  text: 'text-emerald-600' },
    ]),
    ...(currentUser?.role === 'Developer' ? [
      { id: 'developer', label: 'Developer Tools', icon: Terminal, color: 'bg-slate-900', text: 'text-slate-900' }
    ] : []),
    ...(currentUser?.role === 'Admin' || currentUser?.role === 'Developer' ? [{
      id: 'danger', label: 'Danger Zone', icon: Trash2, color: 'bg-red-600', text: 'text-red-600'
    }] : []),
  ];

  // If staff, default to backup tab
  useEffect(() => {
    if (isStaff) setActiveTab('backup');
  }, [isStaff]);

  return (
    <div className="animate-fade-in space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-slate-600/10 dark:bg-slate-600/20 flex items-center justify-center">
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400">System configuration and management</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start h-[calc(100vh-220px)]">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1.5 font-bold">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 border',
                activeTab === tab.id
                  ? 'bg-white dark:bg-dark-900 shadow-sm text-slate-900 dark:text-white border-slate-200 dark:border-dark-700/50'
                  : 'text-slate-500 dark:text-dark-500 hover:text-slate-700 dark:hover:text-dark-300 hover:bg-slate-50 dark:hover:bg-dark-800/30 border-transparent'
              )}>
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'bg-slate-100 dark:bg-dark-810'
              )}>
                <tab.icon className="w-4 h-4" />
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full animate-slide-up h-full overflow-auto">

          {/* General */}
          {activeTab === 'general' && (
            <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50 h-full">
              <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-primary-500/5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="font-bold text-slate-900 dark:text-white">Financial Record Setup</h2>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div>
                  <label className="label mb-3 block text-sm font-black uppercase tracking-widest text-slate-400">
                    Software Starting Date
                  </label>
                  <input type="date"
                    className="input w-full md:w-80 !py-3 !text-sm !font-bold"
                    value={settings.startDate}
                    onChange={handleUpdateStartDate}
                  />
                  <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-5 text-amber-700 dark:text-amber-400 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-base font-black mb-1 uppercase tracking-tighter">Important System Notice</p>
                      <p className="text-sm leading-relaxed opacity-80 font-medium">
                        Setting a start date will filter out all transactions recorded before this threshold
                        across all modules. Use this to start a new financial cycle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup & Restore */}
          {activeTab === 'backup' && <BackupPanel />}

          {/* Shortcuts Management */}
          {activeTab === 'shortcuts' && <KeyboardShortcutsPanel />}

          {/* User Management */}
          {activeTab === 'users' && (
            <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50 h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-600/10 flex items-center justify-center mb-6">
                <ShieldCheck className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Login Access Control</h2>
              <p className="text-slate-500 dark:text-dark-400 max-w-md mx-auto mb-8 font-medium">
                Manage who has access to your business data. Create new staff accounts,
                update passwords, or modify administrative privileges.
              </p>
              <button onClick={() => setShowManageUsers(true)}
                className="btn-primary flex items-center gap-2 !px-12 !py-4 text-base font-black shadow-2xl shadow-emerald-600/20">
                <UserCog className="w-5 h-5" /> Manage System Users
              </button>
              <div className="mt-12 flex gap-8">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{settings.users.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Users</p>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-dark-700" />
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-600 uppercase">Active</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Status</p>
                </div>
              </div>
            </div>
          )}

          {/* Developer Tools */}
          {activeTab === 'developer' && (
            <div className="space-y-12">
              <DeveloperSettings />
              <div className="pt-12 border-t border-slate-200 dark:border-dark-700/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Developer Backup Access</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Quick backup & restore for debugging</p>
                  </div>
                </div>
                <BackupPanel />
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === 'danger' && (
            <div className="glass rounded-2xl overflow-hidden border border-red-200/50 dark:border-red-900/30">
              <div className="p-5 border-b border-red-100 dark:border-red-900/30 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <h2 className="font-black text-red-700 dark:text-red-400">Danger Zone</h2>
                </div>
              </div>
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">Reset All Business Data</h4>
                    <p className="text-sm text-slate-600 dark:text-dark-400">
                      Permanently delete all purchases, sales, expense, asset, liability, and customer records.
                      User accounts and settings are preserved. <strong>This cannot be undone.</strong>
                    </p>
                  </div>
                  <button onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-colors whitespace-nowrap shadow-lg shadow-red-600/20">
                    <Trash2 className="w-4 h-4" /> Reset All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ManageUsersModal isOpen={showManageUsers} onClose={() => setShowManageUsers(false)} />

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-center text-slate-900 dark:text-white">⚠️ CRITICAL WARNING</h3>
            <p className="text-sm text-slate-600 dark:text-dark-400 text-center mt-2 leading-relaxed">
              This will <strong className="text-red-600">permanently delete ALL</strong> purchases, sales,
              expenses, assets, liabilities and customer records.
              This action <strong>cannot be undone</strong>.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-dark-700 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors">
                Cancel — Keep Data
              </button>
              <button onClick={handleReset}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-colors">
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
