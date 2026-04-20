import { useState, useEffect } from 'react';
import { 
  Shield, 
  Layout, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Users,
  Key,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import { getSetting, setSetting } from '../../lib/db';

const ALL_MENUS = [
  'Dashboard',
  'Purchase',
  'Sale',

  'Expense',
  'Asset',
  'Liability',
  'Stock',
  'Customer'
];

export default function DeveloperSettings() {
  const { settings, updateSettings, resetAllData } = useStore();
  const { toast } = useToast();
  const [softwareName, setSoftwareName] = useState(settings?.softwareName || 'HR Filling Station');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');

  // Google API Credentials
  const [clientId,     setClientId]     = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret,   setShowSecret]   = useState(false);
  const [savingCreds,  setSavingCreds]  = useState(false);
  const [credsSaved,   setCredsSaved]   = useState(false);

  useEffect(() => {
    (async () => {
      const id  = await getSetting('googleClientId');
      const sec = await getSetting('googleClientSecret');
      if (id)  { setClientId(id); setCredsSaved(true); }
      if (sec) { setClientSecret(sec); }
    })();
  }, []);

  const handleSaveCreds = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast('Enter both Client ID and Client Secret.', 'error');
      return;
    }
    setSavingCreds(true);
    await setSetting('googleClientId',     clientId.trim());
    await setSetting('googleClientSecret', clientSecret.trim());
    setCredsSaved(true);
    setSavingCreds(false);
    toast('Google API credentials saved! Users can now sign in with Google.', 'success');
  };

  const handleClearCreds = async () => {
    await setSetting('googleClientId',     '');
    await setSetting('googleClientSecret', '');
    setClientId('');
    setClientSecret('');
    setCredsSaved(false);
    toast('Google API credentials cleared.', 'success');
  };

  const handleSaveBranding = () => {
    updateSettings({ softwareName });
    toast('Software branding updated!', 'success');
  };

  const toggleMenu = (menu: string) => {
    const hiddenMenus = settings?.hiddenMenus || [];
    const hidden = hiddenMenus.includes(menu)
      ? hiddenMenus.filter(m => m !== menu)
      : [...hiddenMenus, menu];
    updateSettings({ hiddenMenus: hidden });
  };

  const handleReset = () => {
    if (resetCode === 'RESET123') {
      resetAllData();
      toast('All data has been wiped successfully!', 'success');
      setShowResetConfirm(false);
      setResetCode('');
    } else {
      toast('Invalid reset code!', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Software Branding */}
      <section className="bg-white dark:bg-dark-900 rounded-[32px] p-8 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Layout className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Software Branding</h3>
            <p className="text-xs text-slate-500 font-bold">Customize the application name globally</p>
          </div>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            className="flex-1 bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700/50 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={softwareName}
            onChange={(e) => setSoftwareName(e.target.value)}
          />
          <button
            onClick={handleSaveBranding}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-black transition-all active:scale-95"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </section>

      {/* Menu Visibility Control */}
      <section className="bg-white dark:bg-dark-900 rounded-[32px] p-8 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Menu Visibility</h3>
            <p className="text-xs text-slate-500 font-bold">Toggle menu items for Admins & Staff</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_MENUS.map(menu => {
            const hiddenMenus = settings?.hiddenMenus || [];
            const isHidden = hiddenMenus.includes(menu);
            return (
              <button
                key={menu}
                onClick={() => toggleMenu(menu)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isHidden 
                    ? 'border-red-100 bg-red-50/50 dark:bg-red-500/5 dark:border-red-500/20 text-red-600' 
                    : 'border-slate-100 bg-slate-50/50 dark:bg-dark-950 dark:border-dark-700/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-sm font-black">{menu}</span>
                {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* License & Activation */}
      <section className="bg-white dark:bg-dark-900 rounded-[32px] p-8 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">License & Activation</h3>
            <p className="text-xs text-slate-500 font-bold">Control system access and hardware locking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hardware Lock */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-dark-700/50">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Hardware Authorization
            </h4>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Current Machine ID</p>
              <code className="block p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-dark-700/50 text-[11px] font-mono text-blue-600 dark:text-blue-400 break-all">
                {useStore.getState().currentMachineId || 'Unable to detect'}
              </code>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Authorized Machine ID</p>
              <code className="block p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-dark-700/50 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 break-all">
                {settings.authorizedMachineId || 'None (Unlocked)'}
              </code>
            </div>
            <button
              onClick={() => {
                const currentId = useStore.getState().currentMachineId;
                if (currentId) {
                  updateSettings({ authorizedMachineId: currentId });
                  toast('This PC is now authorized!', 'success');
                }
              }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Authorize This PC
            </button>
          </div>

          {/* Time Window */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-dark-700/50">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              License Period
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                <input
                  type="date"
                  className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                  value={settings.licenseStartDate || ''}
                  onChange={(e) => updateSettings({ licenseStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                <input
                  type="date"
                  className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                  value={settings.licenseEndDate || ''}
                  onChange={(e) => updateSettings({ licenseEndDate: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">License Status</p>
              {(() => {
                const now = new Date().toISOString().split('T')[0];
                const start = settings.licenseStartDate;
                const end = settings.licenseEndDate;
                if (!start || !end) return <span className="text-xs font-black text-amber-500">Not Configured</span>;
                if (now < start) return <span className="text-xs font-black text-blue-500">Not Started Yet</span>;
                if (now > end) return <span className="text-xs font-black text-red-500">Expired</span>;
                return <span className="text-xs font-black text-emerald-500">Active</span>;
              })()}
            </div>
            <p className="text-[9px] text-slate-400 leading-tight font-medium">
              Admin & Staff users will be blocked if the current date is outside this range or if the hardware ID does not match.
            </p>
          </div>
        </div>
      </section>

      {/* System Credentials & Users */}
      <section className="bg-white dark:bg-dark-900 rounded-[32px] p-8 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Credentials Management</h3>
              <p className="text-xs text-slate-500 font-bold">Developer tools for user oversight</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm font-bold text-slate-600 dark:text-dark-400 mb-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl">
          Use the Standard User Management system in the main settings tab to manage all accounts. 
          As Developer, you have rights to override any password or role.
        </p>
      </section>

      {/* Google API Credentials */}
      <section className="bg-white dark:bg-dark-900 rounded-[32px] p-8 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Google API Credentials</h3>
            <p className="text-xs text-slate-500 font-bold">Configure once so users can sign in with Google for backups</p>
          </div>
        </div>

        {credsSaved ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-900/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Credentials Configured</p>
                <p className="text-xs text-slate-500 font-mono truncate">{clientId.slice(0, 40)}…</p>
              </div>
              <button onClick={handleClearCreds} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors shrink-0">
                Clear
              </button>
            </div>
            <p className="text-xs text-slate-500 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl">
              ✅ Users can now click <strong>"Sign in with Google"</strong> in the Backup section to connect their Google account — no manual entry needed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 mb-4">
              Enter your Google Cloud OAuth 2.0 credentials. Go to{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
                className="text-blue-500 underline font-bold">console.cloud.google.com</a>
              {' '}→ Credentials → Create OAuth 2.0 Client ID. Set redirect URI to{' '}
              <code className="text-xs font-mono bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded">http://localhost:3001/oauth/callback</code>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="1234567890-abc...apps.googleusercontent.com"
                  className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700/50 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder="GOCSPX-…"
                    className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700/50 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleSaveCreds}
                disabled={savingCreds || !clientId.trim() || !clientSecret.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {savingCreds ? 'Saving…' : 'Save Google Credentials'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 dark:bg-red-950/20 rounded-[32px] p-8 border border-red-100 dark:border-red-900/20 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-red-900 dark:text-red-400">Danger Zone</h3>
            <p className="text-xs text-red-600/60 font-bold uppercase tracking-wider">Irreversible System Actions</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 p-6 rounded-2xl bg-white dark:bg-dark-900/50 border border-red-200/50 dark:border-red-900/20">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Reset All Data</h4>
            <p className="text-xs text-slate-500 font-bold">Wipe all transactions and categories. Users and settings remain.</p>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-red-700 transition-all active:scale-95"
          >
            System Wipe
          </button>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <Modal
          onClose={() => setShowResetConfirm(false)}
          title="CRITICAL: DATA WIPE"
        >
          <div className="space-y-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex gap-4 border border-red-100 dark:border-red-900/20">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                This action is destructive. All transaction records across all modules will be deleted forever. Use with extreme caution.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Type "RESET123" to confirm</label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700/50 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Confirmation code..."
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-500/20"
            >
              Confirm & Wipe System
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
