import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Settings, LogOut, X, Plus, Minus, RotateCcw, Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

const navItems = [
  { label: 'Dashboard',  path: '/',           icon: LayoutDashboard },
  { label: 'Sale',       path: '/sale',       icon: TrendingUp },
  { label: 'Purchase',   path: '/purchase',   icon: ShoppingCart },
  { label: 'Expense',    path: '/expense',    icon: DollarSign },
  { label: 'Asset',      path: '/asset',      icon: Package },
  { label: 'Liability',  path: '/liability',  icon: AlertTriangle },
  {
    label: 'Stock',
    path: '/stock',
    icon: BarChart3,
    children: [
      { label: 'HSD Stock', path: '/stock/hsd', color: 'bg-amber-500' },
      { label: 'PMG Stock', path: '/stock/pmg', color: 'bg-emerald-500' },
    ],
  },
  { label: 'Customer',  path: '/customer',  icon: Users },
  { label: 'Settings',  path: '/settings',  icon: Settings },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
  onCloseMobile?: () => void;
};

export default function Sidebar({ className = '', onNavigate, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { logout, settings, updateSettings } = useStore();

  const handleZoom = async (delta: number) => {
    const newZoom = Math.min(Math.max(settings.zoomLevel + delta, 0.5), 2.0);
    await updateSettings({ zoomLevel: newZoom });
    document.documentElement.style.zoom = String(newZoom);
  };

  const resetZoom = async () => {
    await updateSettings({ zoomLevel: 1.0 });
    document.documentElement.style.zoom = '1.0';
  };

  return (
    <aside className={cn(
      "relative h-screen flex-shrink-0 flex flex-col transition-all duration-300 border-r border-slate-100 dark:border-dark-800 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl shadow-2xl w-64",
      className
    )}>
      {/* Header — Safe Area Padding Added */}
      <div className="pt-[env(safe-area-inset-top,44px)] px-4 pb-4 border-b border-slate-50 dark:border-dark-800/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-xl p-1.5 border border-slate-150">
              <img src="/assets/logo-hr.png" alt="HR" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <p className="text-slate-900 dark:text-white font-black text-[13px] leading-tight truncate max-w-[120px]">
                {settings.softwareName || 'HR Filling Station'}
              </p>
              <p className="text-slate-400 dark:text-dark-500 text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5">Business Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={logout}
              className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-white hover:bg-slate-200 dark:hover:bg-dark-700 transition-all shadow-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map(item => {
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
                  'flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-300 relative group mb-1',
                  active 
                    ? 'bg-primary-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.3)]' 
                    : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800/50'
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "scale-110" : "")} />
                <span className="flex-1 truncate">{label}</span>
                {active && (
                    <div className="absolute left-1 top-1/4 bottom-1/4 w-1 bg-white/50 rounded-full" />
                )}
              </NavLink>

              {hasChildren && active && (
                <div className="ml-8 space-y-1 mb-2 animate-in slide-in-from-top-1 duration-200">
                  {children.map((child: any) => {
                    const childActive = location.pathname === child.path;
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200',
                          childActive
                            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10'
                            : 'text-slate-400 dark:text-dark-500 hover:text-slate-600 dark:hover:text-dark-300'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', child.color)} />
                        {child.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer — Uplifted Zoom & Control Bar */}
      <div className="p-4 bg-slate-50/50 dark:bg-dark-950/20 border-t border-slate-50 dark:border-dark-800/50 pb-[calc(env(safe-area-inset-bottom,20px)+1rem)]">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-600">Interface Zoom</span>
          <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-lg border border-primary-100 dark:border-primary-900/30">
            {Math.round(settings.zoomLevel * 100)}%
          </span>
        </div>
        
        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-dark-850 rounded-[2rem] shadow-lg border border-slate-100 dark:border-dark-800">
          <button 
            onClick={() => handleZoom(-0.1)} 
            className="flex-1 h-11 flex items-center justify-center rounded-full bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
          
          <button 
            onClick={onCloseMobile}
            className="flex-1 h-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-750 text-slate-600 dark:text-white transition-all active:scale-90"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button 
            onClick={resetZoom} 
            className="flex-1 h-11 flex items-center justify-center rounded-full bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => handleZoom(0.1)} 
            className="flex-1 h-11 flex items-center justify-center rounded-full bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
            title="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
