import { useState, useEffect, useRef } from 'react';
import {
  Settings, ShieldCheck, AlertCircle, Calendar,
  Cloud, RefreshCcw, Save, HardDrive, CloudOff, CheckCircle2,
  Download, Upload, Trash2, Eye, EyeOff, ArrowRight, Undo2,
  FileJson, FileSpreadsheet, FolderOpen, Zap, User
} from 'lucide-react';
import { useStore } from '../store/useStore';
import ManageUsersModal from '../components/modals/ManageUsersModal';
import Modal from '../components/ui/Modal';
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
  openLocalBackupPicker,
  restoreFromFilePath,
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

  // ── Export / Snapshot ───────────────────────────────────────────────────
  const [exporting,   setExporting]   = useState(false);
  const [lastExport,  setLastExport]  = useState('');
  const [exportPath,  setExportPath]  = useState('');

  const handleExportData = async () => {
    setExporting(true);
    setProgress({ msg: 'Exporting all data to CSV + JSON…', active: true });
    try {
      const path = await invoke<string>('create_full_export_zip');
      const ts = new Date().toLocaleString();
      setLastExport(ts);
      setExportPath(path);
      toast(`✅ Full export saved!`, 'success');
    } catch (err: any) {
      toast(`Export failed: ${err?.message ?? err}`, 'error');
    } finally {
      setExporting(false);
      setProgress({ msg: '', active: false });
    }
  };

  // ── Manual PIN Fallback ────────────────────────────────────────────────────
  const [showManualPin,  setShowManualPin]  = useState(false);
  const [manualPin,      setManualPin]      = useState('');

  // ── Backup / Restore ───────────────────────────────────────────────────────
  const [backupList,    setBackupList]    = useState<DriveFile[]>([]);
  const [loadingList,   setLoadingList]   = useState(false);
  const [progress,      setProgress]      = useState<{ msg: string; active: boolean }>({ msg: '', active: false });
  const _driveName = driveName; void _driveName; // suppress unused warning
  const [confirmRestore, setConfirmRestore] = useState<DriveFile | null>(null);
  const [confirmLocalRestore, setConfirmLocalRestore] = useState<{ name: string; path?: string; file?: File } | null>(null);
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

  // ── Sub-Tab Navigation ───────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<'cloud' | 'local' | 'export' | 'tools'>('cloud');

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const files = await listBackups();
      setBackupList(files);
    } catch (_) { /* not connected yet */ }
    finally     { setLoadingList(false); }
  };

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

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const info = await connectGoogleDrive(manualPin.trim() || undefined);
      setConnected(true);
      setDriveEmail(info.email);
      setDriveName(info.name);
      toast(`✅ Connected as ${info.name || info.email}`, 'success');
      await fetchList();
      setShowManualPin(false);
      setManualPin('');
    } catch (err: any) {
      toast(String(err?.message ?? err), 'error');
    } finally {
      setConnecting(false);
    }
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

  const handleLocalBackup = async () => {
    setProgress({ msg: 'Creating local backup ZIP…', active: true });
    try {
      const zipPath = await downloadLocalBackup();
      if (!zipPath.includes('AppData')) {
        toast(`Local backup saved to:\n${zipPath}`, 'success');
        return;
      }
      try {
        const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
        await revealItemInDir(zipPath);
      } catch (_) { }
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

  const handleNativePicker = async () => {
    try {
      const path = await openLocalBackupPicker();
      if (path) {
        setConfirmLocalRestore({ name: path.split('\\').pop() ?? 'Backup File', path });
      }
    } catch (err: any) {
      toast(`Picker failed: ${err?.message ?? err}`, 'error');
    }
  };

  const handleLocalRestoreAction = async () => {
    const item = confirmLocalRestore;
    if (!item) return;
    setConfirmLocalRestore(null);
    setProgress({ msg: 'Restoring database…', active: true });
    try {
      if (item.path) {
        await restoreFromFilePath(item.path);
      } else if (item.file) {
        await handleLocalRestore(item.file);
      }
      toast('Restore complete! Reloading app…', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast(`Restore failed: ${err?.message ?? err}`, 'error');
      setProgress({ msg: '', active: false });
    }
  };

  const handleLocalRestore = async (file: File) => {
    setConfirmLocalRestore(null);
    setProgress({ msg: 'Reading backup file…', active: true });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = Array.from(new Uint8Array(arrayBuffer));
      const appDir = await invoke<string>('get_app_data_path');
      const tempPath = `${appDir}/local_restore_temp.zip`;
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(tempPath, new Uint8Array(uint8));
      setProgress({ msg: 'Restoring database…', active: true });
      const { closeDB } = await import('../lib/db');
      await closeDB();
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
    <div className="flex flex-col md:flex-row gap-8 h-full min-h-[500px]">
      {/* Sub-Sidebar */}
      <div className="w-full md:w-60 space-y-1 bg-slate-50/50 dark:bg-dark-900/50 p-3 rounded-2xl border border-slate-200/50 dark:border-dark-700/50 h-fit shrink-0">
        <h5 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Backup Methods</h5>
        <button onClick={() => setSubTab('cloud')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            subTab === 'cloud' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800"
          )}>
          <Cloud className="w-4 h-4" /> Cloud Sync (Drive)
        </button>
        <button onClick={() => setSubTab('local')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            subTab === 'local' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800"
          )}>
          <HardDrive className="w-4 h-4" /> Local ZIP Archive
        </button>
        <button onClick={() => setSubTab('export')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            subTab === 'export' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800"
          )}>
          <FileSpreadsheet className="w-4 h-4" /> Excel/CSV Export
        </button>
        <div className="h-px bg-slate-200 dark:bg-dark-700/50 my-2" />
        <button onClick={() => setSubTab('tools')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            subTab === 'tools' ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800"
          )}>
          <Zap className="w-4 h-4" /> Recovery Tools
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar pb-10">
        
        {progress.active && (
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 flex items-center gap-5 animate-in slide-in-from-top duration-500 shadow-2xl">
            <div className="relative shrink-0">
               <RefreshCcw className="w-6 h-6 text-primary-400 animate-spin" />
               <div className="absolute inset-0 bg-primary-500/20 blur-xl animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white mb-2 uppercase tracking-tight">{progress.msg}</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        )}

        {subTab === 'cloud' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {!connected ? (
               <div className="glass rounded-[2rem] p-10 border border-slate-200/50 dark:border-dark-700/50 shadow-sm">
                 <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                    <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-[2rem] flex items-center justify-center shadow-inner shrink-0 rotate-3">
                      <Cloud className="w-12 h-12 text-primary-600" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Google Drive Sync</h3>
                      <p className="text-sm text-slate-500 dark:text-dark-400 font-medium leading-relaxed mt-1">
                        Connect your private cloud storage to enable automated, encrypted backups.
                      </p>
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-dark-900/50 rounded-2xl border border-slate-200 dark:border-dark-800 p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OAuth Configuration</h4>
                      <div className="flex items-center gap-2 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase rounded border border-amber-500/20">
                        Required for Cloud
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Client ID</label>
                        <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
                          placeholder="Paste from Google Console..."
                          className="input w-full !bg-white dark:!bg-dark-900 !py-3 !text-xs !font-mono border-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Client Secret</label>
                        <div className="relative">
                          <input type={showSecret ? "text" : "password"} value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                            placeholder="Enter Secret..."
                            className="input w-full !bg-white dark:!bg-dark-900 !py-3 !text-xs !font-mono pr-12 border-slate-200" />
                          <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-slate-400 hover:text-primary-500 transition-colors">
                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-dark-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-sm">
                        Ensure you use a <span className="text-primary-500">Desktop</span> OAuth client type in Google Console.
                      </div>
                      <button onClick={handleConnectWithCreds} disabled={connecting}
                        className="w-full md:w-auto px-8 py-3.5 bg-primary-600 text-white rounded-xl font-black text-xs shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                        {connecting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                        {connecting ? 'Connecting...' : 'Authorize Sync'}
                      </button>
                    </div>
                 </div>

                 <div className="mt-8 p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex gap-4 text-red-700 dark:text-red-400 shadow-sm">
                    <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest mb-1.5">Getting Error 401 (invalid_client)?</p>
                      <ul className="text-[11px] font-medium opacity-80 list-disc pl-4 space-y-1">
                        <li>Verify that the <b>Client ID</b> and <b>Secret</b> match exactly what's in your Google Console.</li>
                        <li>Ensure you have set the <b>Redirect URI</b> to <code>http://localhost:3001/oauth/callback</code>.</li>
                        <li>Make sure your Google Project is in <b>Production</b> or you are added as a <b>Test User</b>.</li>
                      </ul>
                    </div>
                 </div>
               </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center border border-primary-500/20">
                      <Cloud className="w-10 h-10 text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Cloud Storage Active</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-xl font-black text-white tracking-tight">{driveEmail}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Last Synced: {backupList[0]?.modifiedTime ? new Date(backupList[0].modifiedTime).toLocaleString() : 'Never'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 relative z-10">
                    <button onClick={handleBackupNow} disabled={progress.active}
                      className="px-8 py-3.5 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-blue-50 transition-all shadow-xl shadow-white/5 active:scale-95">
                      Sync Now
                    </button>
                    <button onClick={handleDisconnect} className="px-6 py-3.5 bg-red-600/10 text-red-500 rounded-2xl font-black text-xs hover:bg-red-600/20 transition-all">
                      Logout
                    </button>
                  </div>
                </div>

                <div className="glass rounded-[2rem] border border-slate-200/50 dark:border-dark-700/50 overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-slate-200 dark:border-dark-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-dark-900/30">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" /> Google Drive Snapshot History
                    </h4>
                    <button onClick={fetchList} className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] hover:opacity-70 transition-opacity">
                      Refresh List
                    </button>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-dark-800">
                    {backupList.length > 0 ? backupList.map((bk, i) => (
                      <div key={bk.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-sm",
                            i === 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-slate-100 dark:bg-dark-800"
                          )}>
                            {bk.name.includes('Desktop') ? '💻' : '📱'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{bk.name}</p>
                              {i === 0 && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-full tracking-widest shadow-md shadow-emerald-500/20">Active</span>}
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-1 opacity-70">
                               {new Date(bk.modifiedTime ?? '').toLocaleString()} • {(parseInt(bk.size ?? '0') / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setConfirmRestore(bk)} 
                          className="opacity-0 group-hover:opacity-100 transition-all px-6 py-2.5 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 hover:bg-primary-700 active:scale-95">
                          Restore
                        </button>
                      </div>
                    )) : (
                      <div className="py-20 text-center opacity-40">
                        <CloudOff className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">No Cloud Backups Found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {subTab === 'local' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="glass rounded-[2rem] p-12 text-center border border-slate-200/50 dark:border-dark-700/50 shadow-xl relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner rotate-6">
                <HardDrive className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter uppercase">Local Business Archive</h3>
              <p className="text-sm text-slate-500 dark:text-dark-400 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
                Save a full business snapshot directly to your computer. This ZIP includes the <b>database</b> and a folder of <b>Excel sheets</b> for offline review.
              </p>
              <button onClick={handleLocalBackup} disabled={progress.active}
                className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-4 mx-auto text-xs uppercase tracking-widest">
                <Download className="w-5 h-5" /> Download Local ZIP
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-[2rem] border border-amber-200/50 dark:border-amber-900/30 p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
                  <Upload className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Manual File Restore</h4>
                <p className="text-[11px] text-slate-500 dark:text-dark-400 mb-8 font-medium leading-relaxed">Select a previously saved .zip backup file from your PC to overwrite the current database and restore records.</p>
                <button onClick={handleNativePicker} className="w-full py-3.5 border-2 border-amber-600 text-amber-600 rounded-xl font-black hover:bg-amber-600 hover:text-white transition-all text-[10px] uppercase tracking-[0.2em]">
                  Pick Local ZIP File
                </button>
              </div>
              
              <div className="glass rounded-[2rem] border border-slate-200 dark:border-dark-700 p-8 flex flex-col items-center text-center shadow-sm bg-slate-50/50 dark:bg-dark-900/30">
                <div className="w-16 h-16 bg-slate-200 dark:bg-dark-800 rounded-2xl flex items-center justify-center mb-6">
                  <FolderOpen className="w-8 h-8 text-slate-600" />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Browse Directory</h4>
                <p className="text-[11px] text-slate-500 dark:text-dark-400 mb-8 font-medium leading-relaxed">Directly access the internal folder where the software stores all created local backups and logs.</p>
                <button onClick={async () => {
                  try {
                    const appDir = await invoke<string>('get_app_data_path');
                    const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
                    await revealItemInDir(`${appDir}/backups`);
                  } catch(_) { toast('Could not open folder', 'error'); }
                }} className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-black hover:bg-slate-700 transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl">
                  Open Backups Folder
                </button>
              </div>
            </div>
          </div>
        )}

        {subTab === 'export' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="glass rounded-[2.5rem] p-12 text-center border border-emerald-200/50 dark:border-emerald-900/30 shadow-xl bg-emerald-500/[0.02]">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 shadow-inner -rotate-3 border border-emerald-500/10">
                <FileSpreadsheet className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter uppercase">High-Fidelity Excel Snapshot</h3>
              <p className="text-sm text-slate-500 dark:text-dark-400 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
                Generate human-readable <b>Excel (.csv)</b> files for every module. Perfect for audit, print, or manual data entry into other accounting software.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto mb-10">
                 <div className="p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-dark-800 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Auto-formatted for Excel</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-dark-800 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Includes all Ledger Data</p>
                 </div>
              </div>
              <button onClick={handleExportData} disabled={progress.active}
                className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-4 mx-auto text-xs uppercase tracking-widest">
                <FileJson className="w-5 h-5" /> Export All Module Sheets
              </button>
            </div>
          </div>
        )}

        {subTab === 'tools' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
              <h4 className="text-xl font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3 relative z-10">
                <Zap className="w-6 h-6 text-amber-400" /> Advanced System Recovery
              </h4>
              <div className="space-y-4 relative z-10">
                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary-400 border border-white/10 group-hover:border-primary-500/50 transition-colors">
                         <ShieldCheck className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-base font-black text-white mb-1">Database Health Audit</p>
                         <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed max-w-md">Performs a structural check on the SQLite file to ensure no records are corrupted.</p>
                       </div>
                    </div>
                    <button className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-primary-500/20">Start Audit</button>
                 </div>
                 
                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-red-400 border border-white/10 group-hover:border-red-500/50 transition-colors">
                         <Trash2 className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-base font-black text-white mb-1 text-red-400">Purge Temp Cache</p>
                         <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed max-w-md">Clears the temporary backup cache and old export logs to free up storage space.</p>
                       </div>
                    </div>
                    <button className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-red-600/20">Clear Cache</button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmRestore && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[11000] p-4 animate-in fade-in duration-300"
          onClick={() => setConfirmRestore(null)}>
          <div className="bg-white dark:bg-dark-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 scale-in-center border border-slate-200 dark:border-dark-800"
            onClick={e => e.stopPropagation()}>
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-500/10">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tighter uppercase">Restore From Cloud?</h3>
            <p className="text-sm text-slate-500 dark:text-dark-400 text-center mt-4 leading-relaxed font-medium">
              This will <span className="font-black text-red-600 underline decoration-2 underline-offset-4">completely overwrite</span> your current local data with this cloud snapshot.
            </p>
            <div className="text-[11px] text-center font-mono bg-slate-100 dark:bg-dark-950 px-5 py-4 rounded-2xl text-slate-700 dark:text-primary-400 mt-8 mb-10 break-all border border-slate-200 dark:border-dark-800 shadow-inner">
              {confirmRestore.name}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmRestore(null)}
                className="flex-1 px-6 py-4 border-2 border-slate-200 dark:border-dark-700 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-dark-800 transition-all uppercase tracking-widest active:scale-95">
                Cancel
              </button>
              <button onClick={() => handleCloudRestore(confirmRestore)}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 uppercase tracking-widest active:scale-95">
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmLocalRestore && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[11000] p-4 animate-in fade-in duration-300"
          onClick={() => setConfirmLocalRestore(null)}>
          <div className="bg-white dark:bg-dark-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 scale-in-center border border-slate-200 dark:border-dark-800"
            onClick={e => e.stopPropagation()}>
            <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/20 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-amber-500/10">
              <AlertCircle className="w-12 h-12 text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tighter uppercase">Restore From ZIP?</h3>
            <p className="text-sm text-slate-500 dark:text-dark-400 text-center mt-4 leading-relaxed font-medium">
              Restoring from this file will replace all current business records. Ensure you have a manual backup of your current state first.
            </p>
            <div className="text-[11px] text-center font-mono bg-slate-100 dark:bg-dark-950 px-5 py-4 rounded-2xl text-slate-700 dark:text-amber-500 mt-8 mb-10 break-all border border-slate-200 dark:border-dark-800 shadow-inner">
              {confirmLocalRestore.name}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmLocalRestore(null)}
                className="flex-1 px-6 py-4 border-2 border-slate-200 dark:border-dark-700 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-dark-800 transition-all uppercase tracking-widest active:scale-95">
                Cancel
              </button>
              <button onClick={() => handleLocalRestoreAction()}
                className="flex-1 px-6 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20 uppercase tracking-widest active:scale-95">
                Proceed Restore
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [progress, setProgress] = useState<{ msg: string; active: boolean }>({ msg: '', active: false });
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const isStaff = currentUser?.role === 'Staff';

  const handleUpdateStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    updateSettings({ startDate: date });
    toast(`Software start date set to ${date}`, 'success');
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    setProgress({ msg: 'Resetting all business data...', active: true });
    try {
      await resetAllData();
      toast('✅ All business data has been reset successfully.', 'success');
    } catch (err: any) {
      toast(`Reset failed: ${err?.message ?? err}`, 'error');
    } finally {
      setProgress({ msg: '', active: false });
    }
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

  useEffect(() => {
    if (isStaff) setActiveTab('backup');
  }, [isStaff]);

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      {!mobileDetailOpen && (
        <div className="flex items-center gap-3 mb-8 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
            <p className="text-sm text-slate-500 dark:text-dark-400">System configuration and management</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 gap-6 items-start overflow-hidden relative">
        <div className={cn(
          "w-full md:w-72 flex-shrink-0 space-y-2 h-full overflow-y-auto no-scrollbar",
          mobileDetailOpen ? "hidden md:block" : "block"
        )}>
          {tabs.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => {
                setActiveTab(tab.id as any);
                setMobileDetailOpen(true);
              }}
              className={cn(
                'w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm transition-all duration-300 group relative overflow-hidden',
                activeTab === tab.id
                  ? 'bg-white dark:bg-dark-900 shadow-xl scale-[1.02] z-10'
                  : 'bg-white/50 dark:bg-dark-900/40 hover:bg-white dark:hover:bg-dark-800'
              )}
            >
              {activeTab === tab.id && (
                <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-primary-600 rounded-r-full shadow-[2px_0_10px_rgba(37,99,235,0.4)]" />
              )}
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500',
                  activeTab === tab.id ? `${tab.color} text-white rotate-[360deg] shadow-[0_8px_16px_rgba(0,0,0,0.2)]` : 'bg-slate-100 dark:bg-dark-800 text-slate-500'
                )}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className={cn("font-black uppercase tracking-widest text-[11px]", activeTab === tab.id ? "text-primary-600 dark:text-primary-400" : "text-slate-400")}>
                    Menu Option
                  </p>
                  <p className={cn("font-black text-sm", activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-dark-500")}>
                    {tab.label}
                  </p>
                </div>
              </div>
              <ArrowRight className={cn("w-4 h-4 transition-transform", activeTab === tab.id ? "text-primary-600 translate-x-1" : "text-slate-300 opacity-0 group-hover:opacity-100")} />
            </button>
          ))}
        </div>

        <div className={cn(
          "flex-1 h-full min-w-0 flex flex-col transition-all duration-500 animate-slide-in",
          mobileDetailOpen ? "block fixed inset-0 z-[150] bg-slate-50 dark:bg-dark-950 p-4 md:relative md:inset-auto md:p-0" : "hidden md:flex"
        )}>
          {mobileDetailOpen && (
            <button 
              onClick={() => setMobileDetailOpen(false)}
              className="md:hidden flex items-center gap-2 mb-4 px-4 py-3 bg-white dark:bg-dark-900 rounded-xl shadow-sm border border-slate-200 dark:border-dark-800 font-black text-xs uppercase tracking-widest text-slate-500 active:scale-95 transition-all"
            >
              <Undo2 className="w-4 h-4" /> Back to List
            </button>
          )}

          <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
            
            {progress.active && (
              <div className="mb-6 bg-slate-900 rounded-2xl border border-white/10 p-4 flex items-center gap-4 animate-in slide-in-from-top duration-300">
                <RefreshCcw className="w-5 h-5 text-primary-400 animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-2">{progress.msg}</p>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>
            )}

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

          {activeTab === 'backup' && <BackupPanel />}

          {activeTab === 'shortcuts' && <KeyboardShortcutsPanel />}

          {activeTab === 'users' && (
            <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50 h-full flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-dark-700/50 bg-emerald-500/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest">Login Management</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                <ManageUsersModal />
              </div>
            </div>
          )}

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
    </div>

      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white dark:bg-dark-900 rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-slate-200 dark:border-dark-800 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">CRITICAL WARNING</h3>
            <p className="text-sm text-slate-600 dark:text-dark-400 text-center mb-8 leading-relaxed">
              This will <strong className="text-red-600">permanently delete ALL</strong> business records.
              This action <strong>cannot be undone</strong>.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-dark-700 rounded-2xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleReset}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
