import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';
import { Menu, ArrowLeft } from 'lucide-react';

// Page Imports for Persistence
import Dashboard from '../../pages/Dashboard';
import Purchase  from '../../pages/Purchase';
import Sale      from '../../pages/Sale';
import Expense   from '../../pages/Expense';
import Asset     from '../../pages/Asset';
import Liability from '../../pages/Liability';
import Stock     from '../../pages/Stock';
import Customer  from '../../pages/Customer';
import Settings  from '../../pages/Settings';

import BottomNav from './BottomNav';

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

  // ── Swipe-from-left to open sidebar ─────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      
      // Swipe right to OPEN (detect from up to 100px in from left)
      if (!mobileSidebarOpen && touchStartX.current < 100 && dx > 50 && dy < 80) {
        setMobileSidebarOpen(true);
      }
      // Swipe left to CLOSE (detect anywhere when menu is open)
      else if (mobileSidebarOpen && dx < -50 && dy < 80) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [mobileSidebarOpen]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
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

  const isPath  = (path: string) => location.pathname === path;
  const isStock = location.pathname.startsWith('/stock');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-dark-950 transition-colors duration-300 antialiased">

      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar aria-label="Desktop menu" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[200]">
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

        {/* ── App Bar — safe area pushes content down from notch ── */}
        <header
          className="flex items-center justify-between pb-3 px-4 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 flex-shrink-0 z-[100] shadow-md"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        >
          {/* Left: menu / back button */}
          <div className="flex items-center w-10">
            {location.pathname !== '/' ? (
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-400 active:scale-90 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-400 active:scale-90 transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Centre: logo + title */}
          <div className="flex flex-col items-center py-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center p-0.5 border border-slate-200 shadow-inner overflow-hidden">
                <img src="/assets/logo-hr.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate">
                {LABEL_MAP[location.pathname] || (isStock ? 'Stock' : 'Management')}
              </span>
            </div>
            <span className="text-[7px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] leading-none mt-1 opacity-80 truncate max-w-[120px] text-center">
              {settings.softwareName || 'EBS Petroleum'}
            </span>
          </div>

          {/* Right: placeholder */}
          <div className="flex items-center justify-end w-10" />
        </header>

        {/* Content container — takes remaining height, no bottom padding needed
            because the BottomNav auto-hides. Pages handle their own pb for the
            case when nav IS visible (pb-20 in each page scroll wrapper).        */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-dark-950/50 relative">
          <div className="w-full h-full relative">
            <div style={{ display: isPath('/')          ? 'block' : 'none' }} className="h-full w-full"><Dashboard /></div>
            <div style={{ display: isPath('/purchase')  ? 'block' : 'none' }} className="h-full w-full"><Purchase /></div>
            <div style={{ display: isPath('/sale')      ? 'block' : 'none' }} className="h-full w-full"><Sale /></div>
            <div style={{ display: isPath('/expense')   ? 'block' : 'none' }} className="h-full w-full"><Expense /></div>
            <div style={{ display: isPath('/asset')     ? 'block' : 'none' }} className="h-full w-full"><Asset /></div>
            <div style={{ display: isPath('/liability') ? 'block' : 'none' }} className="h-full w-full"><Liability /></div>
            <div style={{ display: isStock              ? 'block' : 'none' }} className="h-full w-full"><Stock /></div>
            <div style={{ display: isPath('/customer')  ? 'block' : 'none' }} className="h-full w-full"><Customer /></div>
            <div style={{ display: isPath('/settings')  ? 'block' : 'none' }} className="h-full w-full"><Settings /></div>
          </div>
        </div>
      </main>

      <BottomNav onMore={() => setMobileSidebarOpen(true)} />
    </div>
  );
}
