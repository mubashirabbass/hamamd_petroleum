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
  // Controls whether the overlay/sidebar DOM is mounted at all (unmount after close transition ends)
  const [sidebarMounted, setSidebarMounted] = useState(false);

  // Open: mount first, then animate in on next frame
  const openSidebar = () => {
    setSidebarMounted(true);
    // Let DOM paint before triggering transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileSidebarOpen(true));
    });
  };

  // Close: animate out, then unmount after transition ends
  const closeSidebar = () => {
    setMobileSidebarOpen(false);
    // 350ms matches the CSS transition duration
    setTimeout(() => setSidebarMounted(false), 350);
  };

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
      // Swipe right from left edge (first 30px) — open
      if (touchStartX.current < 30 && dx > 50 && dy < 80) {
        openSidebar();
      }
      // Swipe left while sidebar open — close
      if (mobileSidebarOpen && touchStartX.current > 30 && dx < -50 && dy < 80) {
        closeSidebar();
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

      {/* ── Mobile Sidebar — always-mounted w/ CSS slide transition ── */}
      {sidebarMounted && (
        <div className="lg:hidden fixed inset-0 z-[200]">
          {/* Backdrop — fades in/out */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-350"
            style={{ opacity: mobileSidebarOpen ? 1 : 0 }}
            onClick={closeSidebar}
          />
          {/* Sidebar panel — slides in from left / out to left */}
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-dark-900 shadow-2xl"
            style={{
              transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            <Sidebar
              className="!w-full h-full border-none"
              onNavigate={closeSidebar}
              onCloseMobile={closeSidebar}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">

        {/* ── App Bar — padded well below the Android status bar (signals/time) ── */}
        <header
          className="flex items-center justify-between pb-3 px-4 bg-white dark:bg-dark-950 flex-shrink-0 z-[110] border-b border-slate-100 dark:border-dark-800"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)' }}
        >
          {/* Left: Hamburger menu */}
          <div className="flex items-center w-16">
            <button
              onClick={openSidebar}
              className="p-2 -ml-2 text-slate-400 dark:text-dark-500 active:scale-90 transition-all"
            >
              <Menu className="w-6 h-6 flex-shrink-0" />
            </button>
          </div>

          {/* Centre: logo + title block matching screenshot */}
          <div className="flex flex-col items-center py-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm border border-slate-100 overflow-hidden">
                <img src="/assets/logo-hr.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-[900] text-slate-800 dark:text-white uppercase tracking-tight text-[16px] leading-none">
                DASHBOARD
              </span>
            </div>
            <span className="text-[9px] font-black text-[#3658A7] dark:text-primary-400 uppercase tracking-[0.25em] leading-none opacity-90 text-center">
              {settings.softwareName || 'HR FILLING STATION'}
            </span>
          </div>

          {/* Right: profile placeholder/search placeholder matching spacing */}
          <div className="flex items-center justify-end w-16">
             <div className="w-6 h-6" /> {/* Placeholder to balance the left menu button */}
          </div>
        </header>

        {/* Content container */}
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

      <BottomNav onMore={openSidebar} />
    </div>
  );
}
