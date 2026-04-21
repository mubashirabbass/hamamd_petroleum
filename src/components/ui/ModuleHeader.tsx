import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface ModuleHeaderProps {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  onBack?: () => void;
  children?: React.ReactNode;
}

export default function ModuleHeader({ title, icon: Icon, iconClassName, onBack, children }: ModuleHeaderProps) {
  const navigate = useNavigate();
  const softwareName = useStore((s) => s.settings.softwareName);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 flex-shrink-0 z-20">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onBack ? onBack() : navigate('/')}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700 active:scale-95 transition-all text-slate-500 dark:text-dark-400 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:text-primary-600 transition-colors" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-lg bg-primary-600/10 flex items-center justify-center", iconClassName)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-base font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
              {title}
            </h1>
          </div>
          <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mt-0.5 leading-none opacity-80">
            {softwareName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}
