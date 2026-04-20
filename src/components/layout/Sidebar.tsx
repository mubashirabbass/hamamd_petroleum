import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Settings, LogOut, X, Plus, Minus
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
        <div className="h-20 flex items-center px-4 gap-3 border-b border-slate-100 dark:border-dark-800">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xl p-1.5 border border-slate-150">
            <img src="/assets/logo-hr.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 dark:text-white font-black text-sm leading-tight truncate">
              {settings.softwareName || 'HR Filling Station'}
            </p>
            <p className="text-slate-400 dark:text-dark-500 text-[10px] font-bold uppercase tracking-widest">Business Suite</p>
          </div>
          {/* Action Buttons in Header */}
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
                    'flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 relative group mb-1',
                    active 
                      ? 'bg-primary-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]' 
                      : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800'
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "scale-110" : "")} />
                  <span className="flex-1 truncate">{label}</span>
                  {active && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full opacity-0" />
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
                          onClick={onNavigate}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all duration-200',
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
        <div className="p-4 pb-12 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500">Interface Zoom</span>
            <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-2.5 py-0.5 rounded-full shadow-sm">
              {Math.round(settings.zoomLevel * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-dark-850 rounded-2xl shadow-sm border border-slate-200 dark:border-dark-800">
            <button 
              onClick={() => handleZoom(-0.1)} 
              className="flex-1 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-dark-700" />
            <button 
              onClick={() => handleZoom(0.1)} 
              className="flex-1 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 dark:text-dark-200 transition-all active:scale-90"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
