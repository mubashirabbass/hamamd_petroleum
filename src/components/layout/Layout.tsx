import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';
import { Menu } from 'lucide-react';

// Page Imports for Persistence
import Dashboard from '../../pages/Dashboard';
import Purchase from '../../pages/Purchase';
import Sale from '../../pages/Sale';

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-100 dark:bg-dark-950 transition-colors duration-300 antialiased">
      {/* Desktop Sidebar - Explicitly hidden on small screens */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
            onClick={() => setMobileSidebarOpen(false)} 
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-dark-900 shadow-2xl animate-slide-in">
            <Sidebar
              className="!w-full h-full border-none"
              onNavigate={() => setMobileSidebarOpen(false)}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Mobile Header / Top Bar */}
        <div className="lg:hidden flex items-center h-14 px-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 flex-shrink-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-3">
            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">
              {LABEL_MAP[location.pathname] || 'HR Filling Station'}
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 bg-slate-50 dark:bg-dark-950/50">
          <div className="max-w-7xl mx-auto h-full">
            {/* Keep-Alive View Container */}
            <div style={{ display: isPath('/') ? 'block' : 'none' }} className="h-full"><Dashboard /></div>
            <div style={{ display: isPath('/purchase') ? 'block' : 'none' }} className="h-full"><Purchase /></div>
            <div style={{ display: isPath('/sale') ? 'block' : 'none' }} className="h-full"><Sale /></div>

            <div style={{ display: isPath('/expense') ? 'block' : 'none' }} className="h-full"><Expense /></div>
            <div style={{ display: isPath('/asset') ? 'block' : 'none' }} className="h-full"><Asset /></div>
            <div style={{ display: isPath('/liability') ? 'block' : 'none' }} className="h-full"><Liability /></div>
            <div style={{ display: isStock ? 'block' : 'none' }} className="h-full"><Stock /></div>
            <div style={{ display: isPath('/customer') ? 'block' : 'none' }} className="h-full"><Customer /></div>
            <div style={{ display: isPath('/settings') ? 'block' : 'none' }} className="h-full"><Settings /></div>
          </div>
        </div>
      </main>
    </div>
  );
}
