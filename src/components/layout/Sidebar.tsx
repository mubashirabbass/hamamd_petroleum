import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BookOpen,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  Fuel, Settings, LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

const navItems = [
  { label: 'Dashboard',  path: '/',           icon: LayoutDashboard },
  { label: 'Purchase',   path: '/purchase',   icon: ShoppingCart },
  { label: 'Sale',       path: '/sale',       icon: TrendingUp },
  { label: 'Ledger',     path: '/ledger',     icon: BookOpen },
  { label: 'Expense',    path: '/expense',    icon: DollarSign },
  { label: 'Asset',      path: '/asset',      icon: Package },
  { label: 'Liability',  path: '/liability',  icon: AlertTriangle },
  {
    label: 'Stock',
    path: '/stock',
    icon: BarChart3,
    children: [
      { label: 'HSD Stock', path: '/stock/hsd' },
      { label: 'PMG Stock', path: '/stock/pmg' },
    ],
  },
  { label: 'Customer',  path: '/customer',  icon: Users },
  { label: 'Settings',  path: '/settings',  icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, logout } = useStore();

  return (
    <aside className="relative h-screen flex-shrink-0 flex flex-col border-r w-56 bg-white/90 dark:bg-dark-900/95 backdrop-blur-xl border-slate-200 dark:border-dark-700/50">

      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-dark-700/50 gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg">
          <Fuel className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-bold text-[15px] leading-tight">EBS Manager</p>
          <p className="text-slate-500 dark:text-dark-500 text-[11px]">Business Suite</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems
          .filter(item => item.label !== 'Settings' || currentUser?.role === 'Admin')
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
                    'sidebar-item',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive font-medium'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
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
