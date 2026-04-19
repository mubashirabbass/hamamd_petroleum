import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface MobileActivityCardProps {
  title: string;
  subtitle?: string;
  amount: string | number;
  date?: string;
  icon?: LucideIcon;
  iconColor?: string;
  statusBadge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function MobileActivityCard({
  title,
  subtitle,
  amount,
  date,
  icon: Icon,
  iconColor = 'text-primary-600',
  statusBadge,
  onClick,
  className = ''
}: MobileActivityCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-dark-800/60 p-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center gap-4 mb-3",
        onClick && "cursor-pointer",
        className
      )}
    >
      {Icon && (
        <div className={cn("w-12 h-12 rounded-xl bg-slate-50 dark:bg-dark-800/50 flex items-center justify-center flex-shrink-0")}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-black text-slate-900 dark:text-white text-sm truncate uppercase tracking-tight">{title}</p>
          <p className="font-black text-primary-600 dark:text-primary-400 text-sm tabular-nums">
            {typeof amount === 'number' ? `," ${amount.toLocaleString()}` : amount}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 dark:text-dark-500 truncate">{subtitle}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{date}</p>
        </div>

        {statusBadge && (
          <div className="mt-2">
            {statusBadge}
          </div>
        )}
      </div>

      {onClick && (
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-dark-700 flex-shrink-0" />
      )}
    </div>
  );
}
