import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}

export default function Pagination({ page, total, perPage, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  const visible = nums.filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-dark-700/50">
      <span className="text-xs text-slate-500 dark:text-dark-500">
        Page {page} of {pages} — {total} records
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-slate-500 dark:text-dark-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {visible.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && visible[i - 1] !== n - 1 && (
              <span className="text-slate-300 dark:text-dark-600 px-1 text-xs">…</span>
            )}
            <button
              onClick={() => onChange(n)}
              className={cn(
                'w-7 h-7 rounded-lg text-xs font-medium transition-all',
                n === page
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                  : 'text-slate-600 dark:text-dark-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700'
              )}
            >
              {n}
            </button>
          </React.Fragment>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded-lg text-slate-500 dark:text-dark-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
