import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout     from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import Dashboard  from './pages/Dashboard';
import Purchase   from './pages/Purchase';
import Sale       from './pages/Sale';

import Expense    from './pages/Expense';
import Asset      from './pages/Asset';
import Liability  from './pages/Liability';
import Stock      from './pages/Stock';
import Customer   from './pages/Customer';
import Settings   from './pages/Settings';
import Login      from './pages/Login';
import { ThemeProvider } from './contexts/ThemeContext';
import { useStore } from './store/useStore';
import loginBg from './assets/login-bg.jpg';

function DBSplash({ error }: { error: string | null }) {
  // ... (keeping existing DBSplash code)
  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {/* ── Fixed Background Layer (Sharp) ──────────────────────────────────── */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed z-0"
        style={{
          backgroundImage: `url(${loginBg})`,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in-up">
        {/* Branding & Logo Area */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 glass-container soft-glass rounded-[32px] flex items-center justify-center p-3 !bg-white/[0.12]">
              <div 
                className="blur-buffer !bg-fixed" 
                style={{ backgroundImage: `url(${loginBg})`, filter: 'blur(20px)' }} 
              />
               <img src="/assets/logo-hr.png" alt="HR" className="w-full h-full object-contain login-logo-spin-cw relative z-10" />
            </div>
            <div className="w-24 h-24 glass-container soft-glass rounded-[32px] flex items-center justify-center p-3 !bg-white/[0.12]">
              <div 
                className="blur-buffer !bg-fixed" 
                style={{ backgroundImage: `url(${loginBg})`, filter: 'blur(20px)' }} 
              />
               <img src="/assets/logo-go.png" alt="GO" className="w-full h-full object-contain relative z-10" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-1">HR Filling Station</h1>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em]">Integrated Management Suite</p>
          </div>
        </div>

        {error ? (
          <div className="glass-container premium-glass-card rounded-3xl px-10 py-6 max-w-sm text-center !bg-red-500/10">
            <div 
              className="blur-buffer !bg-fixed" 
              style={{ backgroundImage: `url(${loginBg})` }} 
            />
            <p className="text-red-400 font-black text-xs uppercase tracking-widest mb-2 relative z-10">Database Connection Failed</p>
            <p className="text-white/70 text-[11px] leading-relaxed font-bold relative z-10">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
              <div className="h-full bg-gradient-to-r from-cyan-400 via-white to-cyan-400 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-white/80 text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">
              Syncing Core Database…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Security Lock Screen ─────────────────────────────────────────────────────

function SystemLocked({ reason }: { reason: 'HARDWARE' | 'LICENSE' }) {
  const { settings, login, currentMachineId, updateSettings } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleDeveloperLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = settings.users.find(u => u.email === email && u.password === password);
    if (user && user.role === 'Developer') {
      // FORCE AUTHORIZATION: If the current machine mismatch occurs (e.g. after a desktop restore), 
      // let the developer "re-pin" the app to this hardware.
      const localId = useStore.getState().localActivationId;
      if (currentMachineId && (!localId || localId !== currentMachineId)) {
        await updateSettings({ authorizedMachineId: currentMachineId });
      }
      login(user);
    } else {
      setError('Invalid developer credentials');
    }
  };

  const isUnactivated = !useStore.getState().localActivationId;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-primary-500/10 rounded-[40px] flex items-center justify-center mb-8 border border-primary-500/20 shadow-2xl shadow-primary-500/10">
        <svg className="w-12 h-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">{settings.softwareName}</h1>
      <p className="text-primary-400 font-black text-xs uppercase tracking-widest mb-6">Security & Authorization</p>

      {!showLogin ? (
        <>
          <div className="max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8">
            {isUnactivated ? (
              <>
                <h2 className="text-xl font-bold text-white mb-3">Software Activation Required</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  This installation of <b>{settings.softwareName}</b> is currently unactivated. A developer must verify this system before it can be used for business transactions.
                </p>
              </>
            ) : reason === 'HARDWARE' ? (
              <>
                <h2 className="text-xl font-bold text-white mb-3">Unauthorized Hardware Detected</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  This system is locked to a specific machine. Hardware signature mismatch:
                </p>
                <code className="block mt-4 p-3 bg-black/40 rounded-xl text-[10px] font-mono text-red-400 break-all border border-red-500/10">
                  {currentMachineId || 'NO_HARDWARE_ID'}
                </code>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-3">Software License Expired</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Usage period ended on <b>{settings.licenseEndDate}</b>. Please contact the developer to renew.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Developer Key Required</p>
            <button 
              onClick={() => setShowLogin(true)}
              className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-primary-500/20"
            >
              {isUnactivated ? 'Activate Product' : 'Developer Login'}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleDeveloperLogin} className="w-full max-w-[320px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <h2 className="text-lg font-bold text-white mb-6">{isUnactivated ? 'System Activation' : 'Developer Verification'}</h2>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Developer Email"
              className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Security Key"
              className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-[10px] text-red-500 font-bold uppercase">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={() => setShowLogin(false)}
                className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-bold text-sm hover:bg-white/10"
              >
                Back
              </button>
              <button 
                type="submit"
                className="flex-2 py-3 bg-primary-600 text-white rounded-xl font-black text-sm hover:bg-primary-700 shadow-xl"
              >
                {isUnactivated ? 'Activate' : 'Authorize'}
              </button>
            </div>
          </div>
        </form>
      )}
      
      <p className="mt-12 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
        System Security — Powered by EBS
      </p>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const { currentUser, dbReady, dbError, initializeFromDB, settings, updateSettings, logout, localActivationId } = useStore();
  const [booting, setBooting] = useState(true);

  // ── Zoom — CSS zoom on <html>; Chromium/WebView on all Tauri targets supports it ──
  const applyZoom = (zoom: number) => {
    document.documentElement.style.zoom = String(zoom);
    // Secondary: Tauri native zoom for desktop window
    try {
      import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
        const appWindow = getCurrentWebviewWindow();
        if ((appWindow as any).setZoom) {
          (appWindow as any).setZoom(zoom).catch(() => {});
        }
      });
    } catch(e) {}
  };

  // Zoom management — runs on load + whenever zoomLevel changes
  useEffect(() => {
    if (!dbReady) return;

    // Apply saved zoom level immediately (persisted from last session)
    applyZoom(settings.zoomLevel);

    // Desktop: Ctrl+scroll wheel zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const newZoom = Math.min(Math.max(settings.zoomLevel + delta, 0.5), 2.0);
        updateSettings({ zoomLevel: newZoom }); // triggers effect re-run → applyZoom
      }
    };

    // Desktop: Ctrl+= / Ctrl+- / Ctrl+0 zoom
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          updateSettings({ zoomLevel: Math.min(settings.zoomLevel + 0.1, 2.0) });
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          updateSettings({ zoomLevel: Math.max(settings.zoomLevel - 0.1, 0.5) });
        } else if (e.key === '0') {
          e.preventDefault();
          updateSettings({ zoomLevel: 1.0 });
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dbReady, settings.zoomLevel, updateSettings]);

  useEffect(() => {
    initializeFromDB().finally(() => setBooting(false));
  }, []);

  // ── Logout on every app close / background ─────────────────────────────
  useEffect(() => {
    if (!dbReady) return;

    // Android/mobile: fires when app goes to background or OS kills it
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logout();
      }
    };

    // Fallback for browsers / PWA that miss visibilitychange
    const handlePageHide = () => logout();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // Desktop: Tauri close-requested — allows cleanup before the window shuts
    let unlisten: (() => void) | null = null;
    import('@tauri-apps/api/webviewWindow')
      .then(({ getCurrentWebviewWindow }) => {
        const appWindow = getCurrentWebviewWindow();
        return appWindow.onCloseRequested(async () => {
          logout();
          // Allow the window to close normally
        });
      })
      .then((fn) => { unlisten = fn; })
      .catch(() => { /* not in Tauri context */ });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (unlisten) unlisten();
    };
  }, [dbReady, logout]);

  // Security Checks
  // We prefer the locally activated ID (ebs_activation.key) if it exists.
  // This ensures that restoring a database from another device DOES NOT lock current hardware.
  const authorizedId = localActivationId || settings.authorizedMachineId;
  const isHardwareLocked = !authorizedId || authorizedId !== useStore.getState().currentMachineId;
  const isLicenseExpired = (() => {
    const now = new Date().toISOString().split('T')[0];
    const start = settings.licenseStartDate;
    const end = settings.licenseEndDate;
    if (!start || !end) return false; // Default: No dates = Infinite access (Developer can set later)
    return (now < start || now > end);
  })();

  const isSystemLocked = (isHardwareLocked || isLicenseExpired) && currentUser?.role !== 'Developer';

  // 1. Show splash while SQLite is initializing
  if (booting || !dbReady) {
    return (
      <ThemeProvider>
        <DBSplash error={dbError} />
      </ThemeProvider>
    );
  }

  // 2. If locked and not developer, show lock screen
  if (isSystemLocked) {
    return (
      <ThemeProvider>
        <SystemLocked reason={isHardwareLocked ? 'HARDWARE' : 'LICENSE'} />
      </ThemeProvider>
    );
  }

  // 3. Normal Auth Flow
  if (!currentUser) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <Login />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index              element={<Dashboard />} />
              <Route path="purchase"   element={<Purchase  />} />
              <Route path="sale"       element={<Sale      />} />

              <Route path="expense"    element={<Expense   />} />
              <Route path="asset"      element={<Asset     />} />
              <Route path="liability"  element={<Liability />} />
              <Route path="stock"      element={<Stock     />} />
              <Route path="stock/:type" element={<Stock    />} />
              <Route path="customer"   element={<Customer  />} />
              <Route path="settings"   element={<Settings  />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}
