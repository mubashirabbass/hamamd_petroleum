import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';

// Page Imports for Persistence
import Dashboard from '../../pages/Dashboard';
import Purchase from '../../pages/Purchase';
import Sale from '../../pages/Sale';
import Ledger from '../../pages/Ledger';
import Expense from '../../pages/Expense';
import Asset from '../../pages/Asset';
import Liability from '../../pages/Liability';
import Stock from '../../pages/Stock';
import Customer from '../../pages/Customer';
import Settings from '../../pages/Settings';

const SHORTCUT_MAP: Record<string, string> = {
  'F1': '/',
  'F2': '/sale',
  'F3': '/purchase',
  'F4': '/ledger',
  'F5': '/expense',
  'F6': '/asset',
  'F7': '/liability',
  'F8': '/stock',
  'F9': '/customer',
  'F10': '/settings',
};

const LABEL_MAP: Record<string, string> = {
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

export default function Layout() {
  const { settings, currentUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const route = SHORTCUT_MAP[e.key];
      if (!route) return;

      const label = LABEL_MAP[route];
      const hiddenMenus = settings.hiddenMenus || [];
      const isDeveloper = currentUser?.role === 'Developer';
      const isAdmin     = currentUser?.role === 'Admin';

      if (!isDeveloper && hiddenMenus.includes(label)) return;
      if (label === 'Settings' && !isAdmin && !isDeveloper) return;

      e.preventDefault();
      navigate(route);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, settings.hiddenMenus, currentUser?.role]);

  // Helper to determine active view
  const isPath = (path: string) => location.pathname === path;
  const isStock = location.pathname.startsWith('/stock');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-dark-950 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        <div className="p-6 h-full">
          {/* Keep-Alive View Container */}
          <div style={{ display: isPath('/') ? 'block' : 'none' }} className="h-full"><Dashboard /></div>
          <div style={{ display: isPath('/purchase') ? 'block' : 'none' }} className="h-full"><Purchase /></div>
          <div style={{ display: isPath('/sale') ? 'block' : 'none' }} className="h-full"><Sale /></div>
          <div style={{ display: isPath('/ledger') ? 'block' : 'none' }} className="h-full"><Ledger /></div>
          <div style={{ display: isPath('/expense') ? 'block' : 'none' }} className="h-full"><Expense /></div>
          <div style={{ display: isPath('/asset') ? 'block' : 'none' }} className="h-full"><Asset /></div>
          <div style={{ display: isPath('/liability') ? 'block' : 'none' }} className="h-full"><Liability /></div>
          <div style={{ display: isStock ? 'block' : 'none' }} className="h-full"><Stock /></div>
          <div style={{ display: isPath('/customer') ? 'block' : 'none' }} className="h-full"><Customer /></div>
          <div style={{ display: isPath('/settings') ? 'block' : 'none' }} className="h-full"><Settings /></div>
        </div>
      </main>
    </div>
  );
}
