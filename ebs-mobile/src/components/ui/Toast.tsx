import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: string; message: string; type: ToastType; }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const icons = {
  success: <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  error:   <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
  info:    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
};
const colors = {
  success: 'border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-50',
  error:   'border-red-500/20 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 text-red-900 dark:text-red-50',
  info:    'border-blue-500/20 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 text-blue-900 dark:text-blue-50',
  warning: 'border-amber-500/20 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 text-amber-900 dark:text-amber-50',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm shadow-2xl shadow-black/5 backdrop-blur-xl animate-slide-up pointer-events-auto max-w-sm ${colors[t.type]}`}
          >
            <div className="flex-shrink-0">{icons[t.type]}</div>
            <span className="flex-1 font-medium leading-tight">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity p-1 -mr-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
