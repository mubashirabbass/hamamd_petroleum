import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
  onPerPageChange?: (pp: number) => void;
}

export default function Pagination({ page, total, perPage, onChange, onPerPageChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;

  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  const visible = nums.filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-dark-700/50 bg-slate-50/30 dark:bg-dark-900/10 gap-4">
      <div className="flex items-center gap-6">
        <span className="text-xs font-medium text-slate-500 dark:text-dark-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          Showing Page {page} of {pages} — {total} records
        </span>
        
        {onPerPageChange && (
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-dark-700 pl-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Rows</span>
            <select 
              value={perPage} 
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-600 dark:text-dark-300 outline-none cursor-pointer hover:text-primary-600 transition-colors"
            >
              {[10, 20, 40, 100].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-xl text-slate-500 dark:text-dark-400 hover:text-primary-600 dark:hover:text-white hover:bg-white dark:hover:bg-dark-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200 dark:hover:border-dark-700 shadow-sm hover:shadow-none"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {visible.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && visible[i - 1] !== n - 1 && (
              <span className="text-slate-300 dark:text-dark-600 px-1 text-xs font-black">···</span>
            )}
            <button
              onClick={() => onChange(n)}
              className={cn(
                'w-8 h-8 rounded-xl text-xs font-bold transition-all border',
                n === page
                  ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/30 scale-110 z-10'
                  : 'text-slate-600 dark:text-dark-400 border-transparent hover:border-slate-200 dark:hover:border-dark-700 hover:bg-white dark:hover:bg-dark-800'
              )}
            >
              {n}
            </button>
          </React.Fragment>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="p-2 rounded-xl text-slate-500 dark:text-dark-400 hover:text-primary-600 dark:hover:text-white hover:bg-white dark:hover:bg-dark-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200 dark:hover:border-dark-700 shadow-sm hover:shadow-none"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
