import { NavLink } from 'react-router-dom';
import { 
  Home, TrendingUp, ShoppingCart, DollarSign, 
  Package, AlertTriangle, BarChart3, Users, Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Home',     path: '/',         icon: Home },
  { label: 'Sale',     path: '/sale',     icon: TrendingUp },
  { label: 'Purchase', path: '/purchase', icon: ShoppingCart },
  { label: 'Expense',  path: '/expense',  icon: DollarSign },
  { label: 'Asset',    path: '/asset',    icon: Package },
  { label: 'Liability',path: '/liability',icon: AlertTriangle },
  { label: 'Stock',    path: '/stock',    icon: BarChart3 },
  { label: 'Customer', path: '/customer', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden bg-white/90 dark:bg-dark-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-dark-800 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
      {/* Scrollable Container */}
      <div className="flex items-center overflow-x-auto no-scrollbar h-16 px-4 gap-2 scroll-smooth">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 min-w-[72px] h-full transition-all duration-300 relative px-2',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-400 dark:text-dark-500 hover:text-slate-600 dark:hover:text-dark-300'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-2 rounded-xl transition-all duration-300',
                  isActive ? 'bg-primary-50 dark:bg-primary-900/20 active-nav-icon' : 'hover:bg-slate-100 dark:hover:bg-dark-800'
                )}>
                  <item.icon className={cn('w-5 h-5', isActive ? 'scale-110' : '')} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none whitespace-nowrap">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-b-full shadow-[0_1px_4px_rgba(37,99,235,0.4)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* Bottom Safe Area Padding */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}
