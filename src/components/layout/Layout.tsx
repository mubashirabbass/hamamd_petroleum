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
import BalanceSheet from '../../pages/BalanceSheet';
import PLS from '../../pages/PLS';
import Capital from '../../pages/Capital';
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

  const { settings } = useStore();
  const isPinned = settings.sidebarPinned;
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(isPinned);

  // Sync internal expansion state when pinned state changes
  useEffect(() => {
    setIsSidebarExpanded(isPinned);
  }, [isPinned]);

  const isTransactionPage = ['/purchase', '/sale', '/expense', '/asset', '/liability', '/customer'].some(p => isPath(p)) || isStock;

  const renderContent = () => {
    if (isPath('/')) return <Dashboard />;
    if (isPath('/purchase')) return <Purchase />;
    if (isPath('/sale')) return <Sale />;
    if (isPath('/expense')) return <Expense />;
    if (isPath('/asset')) return <Asset />;
    if (isPath('/liability')) return <Liability />;
    if (isStock) return <Stock />;
    if (isPath('/customer')) return <Customer />;
    if (isPath('/capital')) return <Capital />;
    if (isPath('/pls')) return <PLS />;
    if (isPath('/balancesheet')) return <BalanceSheet />;
    if (isPath('/settings')) return <Settings />;
    return null;
  };

  return (
    <div 
      className="flex bg-slate-100 dark:bg-dark-950 transition-colors duration-300"
      style={{ height: '100dvh', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar Container with Auto-Hide trigger */}
      <div 
        className="hidden md:block relative z-50 group"
        onMouseEnter={() => !isPinned && setIsSidebarExpanded(true)}
        onMouseLeave={() => !isPinned && setIsSidebarExpanded(false)}
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

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div className="md:hidden sticky top-0 z-30 bg-slate-100/95 dark:bg-dark-950/95 backdrop-blur border-b border-slate-200 dark:border-dark-700 p-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 text-slate-700 dark:text-dark-200 text-sm font-semibold"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
        </div>
        <div className={cn("flex-1 min-h-0 w-full flex flex-col overflow-y-auto smart-scroll", isTransactionPage ? "p-0" : "p-3 md:p-6")}>
          {renderContent()}
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav onMore={() => {}} />
      </main>
    </div>
  );
}
