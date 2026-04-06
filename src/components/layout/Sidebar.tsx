import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BookOpen,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  ChevronLeft, ChevronRight, Fuel, Sun, Moon, Settings, LogOut, User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { useStore } from '../../store/useStore';

const navItems = [
// ... existing items ...
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
      { label: 'PMG Stock', path: '/stock/pmg' }
    ]
  },
  { label: 'Customer',   path: '/customer',   icon: Users },
  { label: 'Settings',   path: '/settings',   icon: Settings },
];

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { currentUser, logout } = useStore();

  return (
    <aside
// ... layout ...
      className={cn(
        'relative h-screen flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r',
        'bg-white/90 dark:bg-dark-900/95 backdrop-blur-xl border-slate-200 dark:border-dark-700/50',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-dark-700/50 gap-3 overflow-hidden">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg">
          <Fuel className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight">EBS Manager</p>
            <p className="text-slate-500 dark:text-dark-500 text-[10px]">Business Suite</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.label !== 'Settings' || currentUser?.role === 'Admin').map((item) => {
          const { label, path, icon: Icon, children } = item as any;
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          const hasChildren = children && children.length > 0;

          return (
            <React.Fragment key={path}>
              <NavLink to={path}
                className={cn(
                  'sidebar-item',
                  active ? 'sidebar-item-active' : 'sidebar-item-inactive font-medium',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? label : undefined}
                end={path === '/stock'} // Don't match /stock/hsd for the main /stock link color if we show children
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate animate-fade-in">{label}</span>}
              </NavLink>

              {hasChildren && !collapsed && (
                <div className="mt-1 space-y-1 ml-4 border-l border-slate-100 dark:border-dark-700/50 pl-2">
                  {children.map((child: any) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) => cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200',
                        isActive 
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
                          : 'text-slate-400 dark:text-dark-500 hover:text-slate-600 dark:hover:text-dark-300'
                      )}
                    >
                       <span className={cn(
                         "w-1 h-1 rounded-full",
                         child.label.includes('HSD') ? "bg-amber-500" : "bg-emerald-500"
                       )}></span>
                       {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Theme & Collapse Buttons */}
      <div className="p-2 border-t border-slate-200 dark:border-dark-700/50 space-y-1">
        <button
          onClick={toggleTheme}
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            'text-slate-500 dark:text-dark-400 hover:text-slate-900 dark:hover:text-dark-100 hover:bg-slate-100 dark:hover:bg-dark-700/50',
            collapsed && 'justify-center px-2'
          )}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && <span className="animate-fade-in">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            'text-slate-500 dark:text-dark-400 hover:text-slate-900 dark:hover:text-dark-100 hover:bg-slate-100 dark:hover:bg-dark-700/50',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse Sidebar</span></>}
        </button>

        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            'text-red-500 hover:text-red-600 hover:bg-red-500/10',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="animate-fade-in">Logout</span>}
        </button>
      </div>

      {!collapsed && currentUser && (
        <div className="p-4 mt-auto border-t border-slate-200 dark:border-dark-700/50 bg-slate-50/50 dark:bg-dark-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-[9px] text-slate-500 dark:text-dark-500 uppercase tracking-wider">{currentUser.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
