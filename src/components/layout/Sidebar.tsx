import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BookOpen,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Settings, LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Plus, Minus, RotateCcw } from 'lucide-react';

const navItems = [
  { label: 'Dashboard',  path: '/',           icon: LayoutDashboard, shortcut: 'F1' },
  { label: 'Sale',       path: '/sale',       icon: TrendingUp,      shortcut: 'F2' },
  { label: 'Purchase',   path: '/purchase',   icon: ShoppingCart,    shortcut: 'F3' },
  { label: 'Ledger',     path: '/ledger',     icon: BookOpen,        shortcut: 'F4' },
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

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, logout, settings, updateSettings } = useStore();

  const handleZoom = async (delta: number) => {
    const newZoom = Math.min(Math.max(settings.zoomLevel + delta, 0.5), 2.0);
    await updateSettings({ zoomLevel: newZoom });
    document.documentElement.style.zoom = ''; // Clear CSS zoom just in case
    try {
      const appWindow = getCurrentWebviewWindow();
      if ((appWindow as any).setZoom) (appWindow as any).setZoom(newZoom).catch(() => {});
    } catch(e) {}
  };

  const resetZoom = async () => {
    await updateSettings({ zoomLevel: 1.0 });
    document.documentElement.style.zoom = ''; // Clear CSS zoom just in case
    try {
      const appWindow = getCurrentWebviewWindow();
      if ((appWindow as any).setZoom) (appWindow as any).setZoom(1.0).catch(() => {});
    } catch(e) {}
  };

  return (
    <aside className="relative h-screen flex-shrink-0 flex flex-col border-r w-56 bg-white/90 dark:bg-dark-900/95 backdrop-blur-xl border-slate-200 dark:border-dark-700/50">

      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-dark-700/50 gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-lg p-1 border border-slate-200">
          <img src="/assets/logo-hr.png" alt="HRM" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-bold text-[15px] leading-tight truncate max-w-[140px]">
            {settings.softwareName || 'EBS Petroleum'}
          </p>
          <p className="text-slate-500 dark:text-dark-500 text-[11px]">Business Suite</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
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
                  className={cn(
                    'sidebar-item group/item',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive font-medium'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1">{label}</span>
                  {item.shortcut && (
                    <kbd className={cn(
                      "hidden group-hover/item:inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-black border transition-all duration-300",
                      active 
                        ? "bg-primary-700/10 border-primary-700/20 text-primary-700 dark:text-primary-400" 
                        : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-500"
                    )}>
                      {item.shortcut}
                    </kbd>
                  )}
                </NavLink>

                {hasChildren && (
                  <div className="mt-1 space-y-1 ml-4 border-l border-slate-100 dark:border-dark-700/50 pl-2">
                    {children.map((child: any) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200',
                          isActive
                            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'text-slate-400 dark:text-dark-500 hover:text-slate-600 dark:hover:text-dark-300'
                        )}
                      >
                        <span className={cn('w-1 h-1 rounded-full', child.label.includes('HSD') ? 'bg-amber-500' : 'bg-emerald-500')} />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </nav>

      {/* Zoom Controls */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-dark-700/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500">Interface Zoom</span>
          <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded">
            {Math.round(settings.zoomLevel * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoom(-0.1)}
            title="Zoom Out"
            className="flex-1 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700/50 hover:bg-slate-50 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-400 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            title="Reset Zoom"
            className="flex-1 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700/50 hover:bg-slate-50 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.1)}
            title="Zoom In"
            className="flex-1 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-700/50 hover:bg-slate-50 dark:hover:bg-dark-800 text-slate-600 dark:text-dark-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logout only */}
      <div className="p-2 border-t border-slate-200 dark:border-dark-700/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
