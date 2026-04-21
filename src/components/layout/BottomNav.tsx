import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, TrendingUp, BarChart3, 
  DollarSign, Package, AlertTriangle, Users, Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { label: 'Home',     path: '/',           icon: LayoutDashboard },
  { label: 'Sales',    path: '/sale',       icon: TrendingUp },
  { label: 'Purchase', path: '/purchase',   icon: ShoppingCart },
  { label: 'Expense',  path: '/expense',    icon: DollarSign },
  { label: 'Asset',    path: '/asset',      icon: Package },
  { label: 'Liability',path: '/liability',  icon: AlertTriangle },
  { label: 'Stock',    path: '/stock',      icon: BarChart3 },
  { label: 'Customer', path: '/customer',   icon: Users },
  { label: 'Settings', path: '/settings',   icon: Settings },
];

export default function BottomNav({ onMore: _onMore }: { onMore: () => void }) {
  const [visible, setVisible] = useState(true);
  const lastScrollY  = useRef(0);
  const lastTouchY   = useRef(0);
  const hideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show nav briefly then hide again after a delay
  const flashVisible = () => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 2500);
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      const y = el.scrollTop ?? window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (delta > 8)       setVisible(false);
      else if (delta < -8) setVisible(true);
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const endY   = e.changedTouches[0].clientY;
      const startY = lastTouchY.current;
      const swipeUp    = startY - endY > 30;
      const fromBottom = startY > window.innerHeight * 0.75;
      if (swipeUp && fromBottom) flashVisible();
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend',   handleTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener('scroll',     handleScroll,     true);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[100] lg:hidden transition-transform duration-300 ease-in-out will-change-transform',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="absolute inset-0 bg-white/70 dark:bg-dark-900/70 backdrop-blur-2xl border-t border-slate-200/50 dark:border-dark-800/50 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]" />

      {/* Nav row — scrollable horizontally */}
      <div
        className="relative flex items-center h-16 w-full overflow-x-auto no-scrollbar px-1"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center min-w-max px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setVisible(true)}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-0.5 w-[72px] h-14 transition-all duration-300 relative',
                isActive
                  ? 'text-primary-600 dark:text-primary-400 font-black'
                  : 'text-slate-400 dark:text-dark-500'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'p-1.5 rounded-xl transition-all duration-300',
                    isActive ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  )}>
                    <item.icon className={cn('w-5 h-5', isActive ? 'scale-110' : '')} />
                  </div>
                  <span className="text-[7.5px] font-black uppercase tracking-widest leading-none">
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-b-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

}
