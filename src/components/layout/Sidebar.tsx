import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BookOpen,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Settings, LogOut, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Plus, Minus, RotateCcw } from 'lucide-react';

const navItems = [
  { label: 'Dashboard',  path: '/',           icon: LayoutDashboard, shortcut: 'F1' },
  { label: 'Sale',       path: '/sale',       icon: TrendingUp,      shortcut: 'F2' },
  { label: 'Purchase',   path: '/purchase',   icon: ShoppingCart,    shortcut: 'F3' },

  { label: 'Expense',    path: '/expense',    icon: DollarSign,      shortcut: 'F5' },
  { label: 'Asset',      path: '/asset',      icon: Package,         shortcut: 'F6' },
  { label: 'Liability',  path: '/liability',  icon: AlertTriangle,   shortcut: 'F7' },
  {
    label: 'Stock',
    path: '/stock',
    icon: BarChart3,
    shortcut: 'F8',
    children: [
      { label: 'HSD Stock', path: '/stock/hsd' },
      { label: 'PMG Stock', path: '/stock/pmg' },
    ],
  },
  { label: 'Customer',  path: '/customer',  icon: Users,     shortcut: 'F9' },
  { label: 'Settings',  path: '/settings',  icon: Settings,  shortcut: 'F10' },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
  onCloseMobile?: () => void;
};

export default function Sidebar({ className = '', onNavigate, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { currentUser, logout, settings, updateSettings } = useStore();

  // ── Zoom — CSS zoom on <html> works in Chromium/WebView (all Tauri targets) ──
  const applyZoom = (zoom: number) => {
    document.documentElement.style.zoom = String(zoom);
    // Also try Tauri native zoom for desktop
    try {
      const appWindow = getCurrentWebviewWindow();
      if ((appWindow as any).setZoom) (appWindow as any).setZoom(zoom).catch(() => {});
    } catch(e) {}
  };

  const handleZoom = async (delta: number) => {
    const newZoom = Math.min(Math.max(settings.zoomLevel + delta, 0.5), 2.0);
    await updateSettings({ zoomLevel: newZoom });
    applyZoom(newZoom);
  };

  const resetZoom = async () => {
    await updateSettings({ zoomLevel: 1.0 });
    applyZoom(1.0);
  };

  return (
    <aside className={`relative h-screen flex-shrink-0 flex flex-col border-r w-72 bg-white/95 dark:bg-dark-900/98 backdrop-blur-xl border-slate-200 dark:border-dark-700/50 ${className}`}>
      
      {/* ── Header ── */}
      <div className="pt-[env(safe-area-inset-top,24px)] px-4 py-4 border-b border-slate-100 dark:border-dark-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-dark-800 p-0.5 bg-white shadow-sm flex items-center justify-center overflow-hidden">
            <img src="/hr-logo.png" alt="HR" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[14px] font-black leading-tight text-slate-900 dark:text-white uppercase tracking-tighter">
              {settings.softwareName || 'HR Filling Sta...'}
            </h2>
            <p className="text-[9px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em] mt-0.5">Business Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={logout} 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-90 transition-all"
              title="Logout"
            >
                <LogOut className="w-5 h-5" />
            </button>
            <button 
              onClick={onCloseMobile}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-600 dark:text-dark-300 active:scale-90 transition-all sm:hidden"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto no-scrollbar smart-scroll">
        {navItems
          .filter(item => {
            if (currentUser?.role === 'Developer') return true;
            if (item.label === 'Settings' && currentUser?.role !== 'Admin') return false;
            const hiddenMenus = settings.hiddenMenus || [];
            return !hiddenMenus.includes(item.label);
          })
          .map(item => {
            const { label, path, icon: Icon, children } = item as any;
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            const hasChildren = children && children.length > 0;

            return (
              <React.Fragment key={path}>
                <NavLink
                  to={path}
                  end={path === '/stock'}
                  onClick={onNavigate}
                  className={cn(
                    'sidebar-item group/item',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover/item:scale-110", active ? "text-white" : "text-slate-400")} />
                  <span className="truncate flex-1 font-[900] tracking-tight">{label}</span>
                  {item.shortcut && (
                    <kbd className={cn(
                      "hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-black border transition-all duration-300",
                      active 
                        ? "bg-white/20 border-white/20 text-white" 
                        : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-500"
                    )}>
                      {item.shortcut}
                    </kbd>
                  )}
                </NavLink>

                {hasChildren && (
                  <div className="mt-2 space-y-1.5 ml-8 border-l-2 border-slate-100 dark:border-dark-800 pl-4 py-1">
                    {children.map((child: any) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) => cn(
                          'flex items-center gap-3 py-2 px-1 rounded-xl text-[12px] font-black transition-all duration-200 uppercase tracking-wider',
                          isActive
                            ? 'text-primary-600 dark:text-primary-400 translate-x-1'
                            : 'text-slate-400 hover:text-slate-600'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', child.label.includes('HSD') ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]')} />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </nav>

      {/* ── Footer / Zoom ── */}
      <div className="mx-3 mb-6 p-4 bg-slate-50 dark:bg-dark-800/40 rounded-[2rem] border border-slate-100 dark:border-dark-800/60 pb-[calc(1rem+env(safe-area-inset-bottom,12px))]">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-[900] uppercase tracking-[0.2em] text-slate-400 dark:text-dark-500">Interface Zoom</span>
          <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 bg-white dark:bg-dark-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-dark-700">
            {Math.round(settings.zoomLevel * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="flex-1 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700/50 text-slate-600 active:scale-90 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="flex-1 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700/50 text-slate-600 active:scale-90 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.1)}
            className="flex-1 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700/50 text-slate-600 active:scale-90 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
