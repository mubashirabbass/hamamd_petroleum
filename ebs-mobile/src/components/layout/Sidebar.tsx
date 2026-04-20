import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BookOpen,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Settings, LogOut, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
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

  // ── Zoom — CSS transform:scale on #root (works in Android WebView + desktop) ──
  const applyZoom = (zoom: number) => {
    const root = document.getElementById('root');
    if (root) {
      if (zoom === 1.0) {
        root.style.transform = '';
        root.style.transformOrigin = '';
        root.style.width = '';
        root.style.height = '';
      } else {
        root.style.transformOrigin = 'top left';
        root.style.transform = `scale(${zoom})`;
        root.style.width = `${(100 / zoom).toFixed(4)}%`;
        root.style.height = `${(100 / zoom).toFixed(4)}vh`;
      }
    }
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
    <aside className={cn(
      "relative h-screen flex-shrink-0 flex flex-col border-r w-72 bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 shadow-2xl transition-all duration-300",
      className
    )}>
      {/* ── Sidebar Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-100">
             <img src="/assets/logo-hr.png" alt="HR" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[14px] font-[900] text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              HR Filling Sta...
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-70">Business Suite</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            onClick={logout}
            className="p-2.5 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 transition-all border border-red-100 dark:border-red-900/20 active:scale-90"
          >
            <LogOut className="w-5 h-5 shadow-sm" />
          </button>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-2.5 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-dark-800 dark:text-dark-400 border border-slate-200 dark:border-dark-700 active:scale-90"
          >
            <X className="w-5 h-5 shadow-sm" />
          </button>
        </div>
      </div>

      {/* ── Navigation List ──────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar py-2">
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
                  end={path === '/'}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-black uppercase tracking-tight transition-all duration-300 group',
                    active 
                      ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/30 active:scale-[0.98]' 
                      : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800'
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-transform", active ? "scale-110" : "group-hover:scale-110")} />
                  <span className="flex-1">{label}</span>
                </NavLink>

                {hasChildren && (
                  <div className="mt-2 mb-4 space-y-1.5 ml-8 border-l-2 border-slate-100 dark:border-dark-800 pl-4 py-1">
                    {children.map((child: any) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) => cn(
                          'flex items-center gap-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all',
                          isActive
                            ? 'text-primary-600 dark:text-primary-400 font-[900]'
                            : 'text-slate-400 dark:text-dark-500 hover:text-slate-700'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', child.label.includes('HSD') ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]')} />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </nav>

      {/* ── Zoom Controls Footer ─────────────────────────────────────────────── */}
      <div className="px-6 py-6 border-t border-slate-100 dark:border-dark-800 bg-slate-50/40 dark:bg-dark-950/20">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Interface Zoom</span>
          <span className="text-[10px] font-black text-primary-600 bg-primary-50 dark:bg-primary-900/40 px-2 py-0.5 rounded-lg border border-primary-100/50 leading-none">
            {Math.round(settings.zoomLevel * 100)}%
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="flex-1 h-10 flex items-center justify-center bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-dark-700 shadow-sm active:scale-95 transition-all text-slate-500 hover:bg-slate-50"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="flex-1 h-10 flex items-center justify-center bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-dark-700 shadow-sm active:scale-95 transition-all text-slate-500 hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.1)}
            className="flex-1 h-10 flex items-center justify-center bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-dark-700 shadow-sm active:scale-95 transition-all text-slate-500 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
