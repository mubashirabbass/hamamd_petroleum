import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, TrendingUp, 
  DollarSign, Package, AlertTriangle, MoreHorizontal 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { label: 'Home',     path: '/',         icon: LayoutDashboard },
  { label: 'Sale',    path: '/sale',     icon: TrendingUp },
  { label: 'Purchase', path: '/purchase', icon: ShoppingCart },
  { label: 'Expense',  path: '/expense',  icon: DollarSign },
  { label: 'Asset',    path: '/asset',    icon: Package },
  { label: 'Liability',path: '/liability',icon: AlertTriangle },
];

export default function BottomNav({ onMore }: { onMore: () => void }) {
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
    // Capture scroll events on any element (captures bubbling)
    const handleScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      const y = el.scrollTop ?? window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (delta > 8)       setVisible(false);
      else if (delta < -8) setVisible(true);
    };

    // Detect upward swipe from bottom third of screen → show nav
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
      window.removeEventListener('touchend',   handleTouchEnd);
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
      {/* Glassmorphic background that covers safe area too */}
      <div className="absolute inset-0 bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-dark-800 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]" />

      {/* Nav row — fixed h-14, safe-area padding ADDS space below (doesn't compress row) */}
      <div
        className="relative flex items-center justify-around h-14 px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setVisible(true)}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all duration-300 relative',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
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
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-b-full" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* More menu button */}
        <button
          onClick={() => { onMore(); setVisible(true); }}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-slate-400 dark:text-dark-500 active:scale-90 transition-transform"
        >
          <div className="p-1.5">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
