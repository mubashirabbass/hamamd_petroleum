import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

// Global function-key map — works on every page inside the layout
const KEY_ROUTES: Record<string, string> = {
  F1:  '/',
  F2:  '/purchase',
  F3:  '/sale',
  F4:  '/ledger',
  F5:  '/expense',
  F6:  '/asset',
  F7:  '/liability',
  F8:  '/stock',
  F9:  '/customer',
  F10: '/settings',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't fire when user is typing in an input, textarea, or select
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const route = KEY_ROUTES[e.key];
    if (route) {
      e.preventDefault();
      navigate(route);
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-dark-950 transition-colors duration-300">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
