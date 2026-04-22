import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export default function LoadingSplash() {
  const { isLoading } = useStore();
  const [progress, setProgress] = useState(0);

  // Sync progress with the splash duration
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 100));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <div className={cn(
      "fixed inset-0 z-[10000] flex items-center justify-center transition-all duration-500",
      isLoading ? "opacity-100 pointer-events-auto bg-black/80 backdrop-blur-md" : "opacity-0 pointer-events-none"
    )}>
      <div className="flex flex-col items-center w-full max-w-sm px-10">
        {/* Circular Logo Container — Matching Image */}
        <div className="relative mb-8">
          {/* Outer Ring */}
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-white/20 flex items-center justify-center relative">
            {/* Inner Glow */}
            <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse" />
            
            {/* Logo */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden flex items-center justify-center relative z-10">
               <img 
                src="/assets/logo-hr.png" 
                alt="Logo" 
                className={cn(
                  "w-full h-full object-contain relative z-20",
                  isLoading && "login-logo-spin-cw"
                )} 
              />
            </div>
          </div>
        </div>

        {/* Text Area — LOADING text */}
        <div className="text-center w-full">
          <h1 className="text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-[0.2em]">
            LOADING
          </h1>
          <p className="text-white font-bold uppercase tracking-widest text-[9px] md:text-[10px] mb-8">
            PLEASE WAIT...
          </p>
          
          {/* Progress Bar — Matching Image */}
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative mb-3">
            <div 
              className="h-full bg-white transition-all duration-100 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Percentage */}
          <p className="text-white font-black text-[10px] tracking-widest uppercase">
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );
}
