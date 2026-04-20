import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  scrollId?: string;
}

export default function PullToRefresh({ onRefresh, children, className, scrollId }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD + 20));
      if (diff > 10) {
        if (e.cancelable) e.preventDefault();
      }
    } else {
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await onRefresh();
      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      id={scrollId}
      className={cn("relative overflow-y-auto h-full scroll-smooth", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-center pointer-events-none z-50 overflow-hidden transition-all duration-200"
        style={{ 
          height: pullDistance,
          opacity: pullDistance / PULL_THRESHOLD,
          transform: `translateY(${pullDistance > 0 ? 0 : -20}px)`
        }}
      >
        <div className="bg-white dark:bg-dark-800 shadow-lg rounded-full p-2 border border-slate-200 dark:border-dark-700">
          <RefreshCw className={cn("w-5 h-5 text-primary-600 animate-spin-slow", isRefreshing && "animate-spin")} />
        </div>
      </div>

      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${isRefreshing ? PULL_THRESHOLD : pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
