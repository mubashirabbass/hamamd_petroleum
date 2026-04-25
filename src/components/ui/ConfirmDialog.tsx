import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ConfirmKind = 'info' | 'warning' | 'error' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: ConfirmKind;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  kind = 'warning',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const icons = {
    info:    <Info className="w-8 h-8 text-blue-500" />,
    warning: <AlertTriangle className="w-8 h-8 text-amber-500" />,
    error:   <AlertCircle className="w-8 h-8 text-red-500" />,
    success: <CheckCircle className="w-8 h-8 text-emerald-500" />,
  };

  const colors = {
    info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30',
    error:   'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30',
  };

  const btnColors = {
    info:    'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
    warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
    error:   'bg-red-600 hover:bg-red-700 shadow-red-600/20',
    success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onCancel}
      />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-dark-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-dark-700 overflow-hidden animate-slide-up">
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6 border animate-breath", colors[kind])}>
              {icons[kind]}
            </div>
            
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
              {title}
            </h3>
            
            <p className="text-sm font-medium text-slate-500 dark:text-dark-400 leading-relaxed">
              {message}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-10">
            <button
              onClick={onCancel}
              className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-all active:scale-95 border border-slate-200 dark:border-dark-700"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                "px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg",
                btnColors[kind]
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
