import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import PLS from './pages/PLS';
import BalanceSheet from './pages/BalanceSheet';
import Capital from './pages/Capital';
import Settings   from './pages/Settings';
import Login      from './pages/Login';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { useStore } from './store/useStore';
import loginBg from './assets/login-bg.jpg';
import { invoke } from '@tauri-apps/api/core';

function DBSplash({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed z-0"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-10" />
      
      <div className="relative z-20 flex flex-col items-center animate-reveal-blur">
        <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center border border-white/20 mb-8 animate-breath shadow-2xl">
           <div className="w-12 h-12 rounded-full border-t-4 border-l-4 border-blue-500 animate-spin" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">HRM PETROLEUM</h1>
        <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px]">Initializing Database</p>
        
        {error && (
          <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl max-w-md text-center">
            <p className="text-red-400 font-bold text-sm leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}


export default function App() {
  const { currentUser, dbReady, dbError, initializeFromDB, settings, updateSettings, logout } = useStore();
  const [booting, setBooting] = useState(true);

  const applyZoom = (zoom: number) => {
    document.documentElement.style.zoom = String(zoom);
  };

  useEffect(() => {
    if (!dbReady) return;
    applyZoom(settings.zoomLevel);
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

  const triggerSnapshot = () => {
    invoke('export_data_snapshot').catch(() => {});
  };
  useEffect(() => {
    if (!dbReady) return;
    setTimeout(triggerSnapshot, 3000);
    const interval = setInterval(triggerSnapshot, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dbReady]);

  // License restriction removed as per user request
  const isSystemLocked = false;

  if (booting || !dbReady) {
    return (
      <ThemeProvider>
        <DBSplash error={dbError} />
      </ThemeProvider>
    );
  }

  // System lock logic removed

  return (
    <ThemeProvider>
      <ConfirmProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={currentUser ? <Layout /> : <Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
