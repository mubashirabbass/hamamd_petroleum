import { useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';

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
  const { settings, currentUser } = useStore();
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    
    const route = KEY_ROUTES[e.key];
    if (route) {
      // Map route back to label for filtering
      const labelMap: Record<string, string> = {
        '/': 'Dashboard',
        '/purchase': 'Purchase',
        '/sale': 'Sale',
        '/ledger': 'Ledger',
        '/expense': 'Expense',
        '/asset': 'Asset',
        '/liability': 'Liability',
        '/stock': 'Stock',
        '/customer': 'Customer',
        '/settings': 'Settings',
      };
      
      const label = labelMap[route];
      const hiddenMenus = settings.hiddenMenus || [];
      if (currentUser?.role !== 'Developer' && hiddenMenus.includes(label)) return;
      if (label === 'Settings' && currentUser?.role === 'Staff') return;

      e.preventDefault(); 
      navigate(route); 
    }
  }, [navigate, settings.hiddenMenus, currentUser?.role]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-dark-950 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
