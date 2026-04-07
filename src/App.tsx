import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout     from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import Dashboard  from './pages/Dashboard';
import Purchase   from './pages/Purchase';
import Sale       from './pages/Sale';
import Ledger     from './pages/Ledger';
import Expense    from './pages/Expense';
import Asset      from './pages/Asset';
import Liability  from './pages/Liability';
import Stock      from './pages/Stock';
import Customer   from './pages/Customer';
import Settings   from './pages/Settings';
import Login      from './pages/Login';
import { ThemeProvider } from './contexts/ThemeContext';
import { useStore } from './store/useStore';

// ─── DB Loading Splash ────────────────────────────────────────────────────────

function DBSplash({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      {/* Logo / Brand */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center p-2 border border-white/20 shadow-2xl">
             <img src="/assets/logo-hr.png" alt="HRM" className="w-full h-full object-contain" />
          </div>
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center p-2 border border-white/20 shadow-2xl">
             <img src="/assets/logo-go.png" alt="GO" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="text-center mt-2">
          <h1 className="text-3xl font-black text-white tracking-tight">HRM Filling Station</h1>
          <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Business Suite</p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-900/30 border border-red-500/30 rounded-2xl px-8 py-5 max-w-sm text-center">
          <p className="text-red-400 font-bold text-sm mb-1">Database Error</p>
          <p className="text-red-300/80 text-xs leading-relaxed">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* Animated progress bar */}
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
          <p className="text-slate-500 text-xs font-medium tracking-widest uppercase animate-pulse">
            Initializing Database…
          </p>
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const { currentUser, dbReady, dbError, initializeFromDB, settings, updateSettings } = useStore();
  const [booting, setBooting] = useState(true);

  // Zoom management
  useEffect(() => {
    if (!dbReady) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const newZoom = Math.min(Math.max(settings.zoomLevel + delta, 0.5), 2.0);
        updateSettings({ zoomLevel: newZoom });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const newZoom = Math.min(Math.max(settings.zoomLevel + 0.1, 0.5), 2.0);
          updateSettings({ zoomLevel: newZoom });
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const newZoom = Math.min(Math.max(settings.zoomLevel - 0.1, 0.5), 2.0);
          updateSettings({ zoomLevel: newZoom });
        } else if (e.key === '0') {
          e.preventDefault();
          updateSettings({ zoomLevel: 1.0 });
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // Apply zoom on change natively
    try {
      import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
        const appWindow = getCurrentWebviewWindow();
        if ((appWindow as any).setZoom) {
          (appWindow as any).setZoom(settings.zoomLevel).catch(() => {});
        }
      });
    } catch(e) {}

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dbReady, settings.zoomLevel, updateSettings]);

  useEffect(() => {
    initializeFromDB().finally(() => setBooting(false));
  }, []);

  // Show splash while SQLite is initializing
  if (booting || !dbReady) {
    return (
      <ThemeProvider>
        <DBSplash error={dbError} />
      </ThemeProvider>
    );
  }

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
              <Route path="ledger"     element={<Ledger    />} />
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
