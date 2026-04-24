import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useStore } from '../../store/useStore';
import { Menu } from 'lucide-react';
import { useShortcuts } from '../../hooks/useShortcuts';
import { cn } from '../../lib/utils';

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

export default function Layout() {
  const location = useLocation();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const deltaX = touchEnd - touchStart;
    
    // Swipe Right (Open) - from left edge
    if (deltaX > 60 && touchStart < 40) {
      setMobileSidebarOpen(true);
    }
    // Swipe Left (Close)
    else if (deltaX < -60 && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
    
    setTouchStart(null);
  };

  // Apply Global Shortcuts
  useShortcuts();

  // Helper to determine active view
  const isPath = (path: string) => location.pathname === path;
  const isStock = location.pathname.startsWith('/stock');

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const isTransactionPage = ['/purchase', '/sale', '/expense', '/asset', '/liability', '/customer'].some(p => isPath(p)) || isStock;

  return (
    <div 
      className="flex h-screen overflow-hidden bg-slate-100 dark:bg-dark-950 transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar Container with Auto-Hide trigger */}
      <div 
        className="hidden md:block relative z-50 group"
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        {/* The Trigger Block - a small hot-zone that stays active even when sidebar is w-0 */}
        <div className="absolute inset-y-0 left-0 w-3 cursor-e-resize" />
        
        <Sidebar isCollapsed={!isSidebarExpanded} />
      </div>

      {mobileSidebarOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 z-50">
            <Sidebar
              className="shadow-2xl"
              onNavigate={() => setMobileSidebarOpen(false)}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="md:hidden sticky top-0 z-30 bg-slate-100/95 dark:bg-dark-950/95 backdrop-blur border-b border-slate-200 dark:border-dark-700 p-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 text-slate-700 dark:text-dark-200 text-sm font-semibold"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
        </div>
        <div className={cn("h-full w-full", isTransactionPage ? "p-0" : "p-3 md:p-6")}>
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

        {/* Mobile Bottom Navigation */}
        <BottomNav onMore={() => {}} />
      </main>
    </div>
  );
}
