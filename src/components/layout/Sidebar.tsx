import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BookOpen,
  DollarSign, Package, AlertTriangle, BarChart3, Users,
  ChevronLeft, ChevronRight, Fuel, Sun, Moon, ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

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
      { label: 'Overview',   path: '/stock' },
      { label: 'HSD Details', path: '/stock/hsd' },
      { label: 'PMG Details', path: '/stock/pmg' },
    ]
  },
  { label: 'Customer',   path: '/customer',   icon: Users },
];

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(['Stock']);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <aside
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
        {navItems.map((item) => {
          const { label, path, icon: Icon, children } = item;
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          const isExpanded = expandedMenus.includes(label);

          if (children && !collapsed) {
            return (
              <div key={label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(label)}
                  className={cn(
                    'sidebar-item w-full',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate animate-fade-in">{label}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="ml-7 space-y-1 animate-slide-up">
                    {children.map(sub => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        end={sub.path === '/stock'}
                        className={({ isActive }) => cn(
                          'flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                          isActive
                            ? 'text-primary-600 dark:text-primary-400 bg-primary-600/10 dark:bg-primary-600/20'
                            : 'text-slate-500 dark:text-dark-400 hover:text-slate-900 dark:hover:text-dark-100 hover:bg-slate-100 dark:hover:bg-dark-700/50'
                        )}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink key={path} to={path}
              className={cn(
                'sidebar-item',
                active ? 'sidebar-item-active' : 'sidebar-item-inactive',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate animate-fade-in">{label}</span>}
            </NavLink>
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
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
