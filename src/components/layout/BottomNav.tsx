import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, TrendingUp, BarChart3, 
  DollarSign, Package, AlertTriangle, Users, Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Home',      path: '/',          icon: LayoutDashboard },
  { label: 'Sales',     path: '/sale',      icon: TrendingUp },
  { label: 'Purchase',  path: '/purchase',  icon: ShoppingCart },
  { label: 'Expense',   path: '/expense',   icon: DollarSign },
  { label: 'Asset',     path: '/asset',     icon: Package },
  { label: 'Liability', path: '/liability', icon: AlertTriangle },
  { label: 'Stock',     path: '/stock',     icon: BarChart3 },
  { label: 'Customer',  path: '/customer',  icon: Users },
  { label: 'Balance',   path: '/balancesheet', icon: LayoutDashboard },
  { label: 'Settings',  path: '/settings',  icon: Settings },
];

export default function BottomNav({ onMore: _onMore }: { onMore: () => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-white/90 dark:bg-dark-900/90 backdrop-blur-2xl border-t border-slate-200/60 dark:border-dark-800/60 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" />

      {/* Nav row — always visible, horizontally scrollable */}
      <div
        className="relative flex items-stretch w-full overflow-x-auto no-scrollbar"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="flex items-stretch min-w-max px-2 h-full">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'relative flex flex-col items-center justify-center gap-1 w-[72px] h-full transition-all duration-200 select-none',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-dark-500'
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar at top */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-b-full" />
                  )}

                  {/* Icon container */}
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 flex-shrink-0',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 shadow-sm scale-105'
                      : 'bg-transparent'
                  )}>
                    <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>

                  {/* Label — always semi-bold */}
                  <span className={cn(
                    'text-[9px] uppercase tracking-[0.06em] leading-none whitespace-nowrap',
                    isActive ? 'font-extrabold' : 'font-semibold'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
