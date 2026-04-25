import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Settings, LogOut, X, Plus, Minus, Wallet, Activity, Pin, PinOff
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
  { label: 'Capital',   path: '/capital',   icon: Wallet },
  { label: 'PLS',       path: '/pls',       icon: Activity },
  { label: 'Balance Sheet', path: '/balancesheet', icon: LayoutDashboard },
  { label: 'Settings',  path: '/settings',  icon: Settings },
];

type SidebarProps = {
  className?: string;
  isCollapsed?: boolean;
  onNavigate?: () => void;
  onCloseMobile?: () => void;
};

export default function Sidebar({ className = '', isCollapsed = false, onNavigate, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { logout, settings, updateSettings } = useStore();

  const handleZoom = async (delta: number) => {
    const newZoom = Math.min(Math.max(settings.zoomLevel + delta, 0.5), 2.0);
    await updateSettings({ zoomLevel: newZoom });
  };

  return (
    <aside className={cn(
      "relative h-screen flex-shrink-0 flex flex-col transition-all duration-300 border-r border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 shadow-2xl",
      isCollapsed ? "w-14" : "w-64",
      className
    )}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className={cn("h-16 flex items-center border-b border-slate-100 dark:border-dark-800 transition-all", isCollapsed ? "justify-center px-1" : "px-3 gap-2")}>
          <div className="w-10 h-10 rounded-2xl bg-white flex-shrink-0 flex items-center justify-center shadow-xl p-1 border border-slate-150">
            <img src="/assets/logo-hr.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight">
                {settings.softwareName || 'HR Filling Station'}
              </p>
              <p className="text-slate-400 dark:text-dark-500 text-[9px] font-bold uppercase tracking-widest">Business Suite</p>
            </div>
          )}
          {/* Action Buttons in Header */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={logout}
                className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-white hover:bg-slate-200 dark:hover:bg-dark-700 transition-all shadow-sm"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          {/* Pin Button */}
          {!isCollapsed && (
            <button
              onClick={() => updateSettings({ sidebarPinned: !settings.sidebarPinned })}
              className={cn(
                "p-1.5 rounded-xl transition-all border",
                settings.sidebarPinned 
                  ? "text-primary-600 bg-primary-50 border-primary-100 dark:bg-primary-900/20 dark:border-primary-900/30" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent dark:hover:bg-dark-800"
              )}
              title={settings.sidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              {settings.sidebarPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-12 pb-32 px-2 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map(item => {
            const { label, path, icon: Icon, children } = item as any;
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            const hasChildren = children && children.length > 0;

            return (
              <React.Fragment key={path}>
                <NavLink
                  to={path}
                  end={path === '/stock'}
                  onClick={() => {
                    if (onNavigate) onNavigate();
                  }}
                  className={cn(
                    'flex items-center rounded-xl text-[13px] font-semibold transition-all duration-300 relative group mb-0.5',
                    isCollapsed ? "justify-center px-0 py-2" : "px-3 py-2 gap-2.5",
                    active 
                      ? 'bg-primary-600 text-white shadow-[0_3px_10px_rgba(37,99,235,0.2)]' 
                      : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800'
                  )}
                  title={isCollapsed ? label : ""}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "scale-105" : "")} />
                  {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
                  {active && !isCollapsed && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full" />
                  )}
                </NavLink>

                {hasChildren && active && (
                  <div className="ml-8 space-y-0.5 animate-in slide-in-from-top-1 duration-200 mb-2">
                    {children.map((child: any) => {
                      const childActive = location.pathname === child.path;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={() => {
                            if (onNavigate) onNavigate();
                          }}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200',
                            childActive
                              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/10'
                              : 'text-slate-400 dark:text-dark-500 hover:text-slate-600 dark:hover:text-dark-300'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full ring-2 ring-transparent', child.color)} />
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

        {/* Sidebar Footer — Zoom Controls */}
        <div className={cn("border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 transition-all", isCollapsed ? "p-2 pb-4" : "p-4 pb-4")}>
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500">Zoom</span>
              <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded-full shadow-sm">
                {Math.round(settings.zoomLevel * 100)}%
              </span>
            </div>
          )}
          <div className={cn("flex items-center bg-white dark:bg-dark-850 rounded-xl shadow-sm border border-slate-200 dark:border-dark-800 overflow-hidden", isCollapsed ? "flex-col gap-1 p-1" : "gap-1 p-1")}>
            <button 
              onClick={() => handleZoom(-0.1)} 
              className="flex-1 w-full h-8 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            {!isCollapsed && <div className="w-px h-4 bg-slate-200 dark:bg-dark-700" />}
            <button 
              onClick={() => handleZoom(0.1)} 
              className="flex-1 w-full h-8 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Developer Tag */}
        {!isCollapsed && (
          <div className="px-3 py-2 pb-6">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-dark-950/50 border border-slate-200 dark:border-dark-800 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em] mb-1">Software Solution By</p>
              <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">MB Soft and Tech</p>
              <div className="mt-1.5 h-px w-6 bg-primary-500/30" />
              <p className="mt-1.5 text-[9px] font-bold text-primary-600 dark:text-primary-400 font-mono tracking-wider">0304-1654629</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
