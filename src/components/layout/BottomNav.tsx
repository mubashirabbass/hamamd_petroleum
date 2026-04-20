import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, TrendingUp, ShoppingCart, 
  DollarSign, Package, AlertTriangle 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'HOME',     path: '/',           icon: Home },
  { label: 'SALE',     path: '/sale',       icon: TrendingUp },
  { label: 'PURCHASE', path: '/purchase',   icon: ShoppingCart },
  { label: 'EXPENSE',  path: '/expense',    icon: DollarSign },
  { label: 'ASSET',    path: '/asset',      icon: Package },
  { label: 'LIABILITY',path: '/liability',  icon: AlertTriangle },
];

export default function BottomNav({ onMore }: { onMore?: () => void }) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-dark-900 border-t border-slate-100 dark:border-dark-800 flex items-center justify-around px-2 z-[150] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        const active = item.path === '/' 
          ? location.pathname === '/' 
          : location.pathname.startsWith(item.path);
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 min-w-[60px]",
              active ? "text-[#3B82F6] dark:text-primary-400" : "text-slate-400 dark:text-dark-400"
            )}
          >
            <div className={cn(
              "p-2 rounded-2xl transition-all duration-500",
              active ? "bg-blue-50 dark:bg-primary-900/20 scale-110" : "bg-transparent"
            )}>
              <item.icon className={cn("w-5 h-5", active ? "stroke-[2.5px]" : "stroke-[2px]")} />
            </div>
            <span className={cn(
              "text-[8px] font-black uppercase tracking-[0.05em] leading-none",
              active ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
