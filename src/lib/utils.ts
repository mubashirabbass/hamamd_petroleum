import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export function startOfYear(): string {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
}

export function paginate<T>(items: T[], page: number, perPage: number): T[] {
  return items.slice((page - 1) * perPage, page * perPage);
}

export function totalPages(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

export function filterByStartDate<T extends { date: string }>(items: T[], startDate: string): T[] {
  if (!items) return [];
  if (!startDate) return items;
  return items.filter(item => item.date >= startDate);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const maybeMessage = (error as Record<string, unknown>).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;

    const maybeError = (error as Record<string, unknown>).error;
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Ignore serialization errors and fall through to default text.
    }
  }

  return 'Unknown error';
}

export function handleFormKeyDown(e: React.KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

  if (target.tagName === 'TEXTAREA') return;
  if (target instanceof HTMLInputElement && target.type === 'date') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') return;
    return;
  }

  const form = target.closest('form');
  if (!form) return;

  const elements = Array.from(form.querySelectorAll('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])')) as HTMLElement[];
  const index = elements.indexOf(target);

  const moveFocus = (delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex >= 0 && nextIndex < elements.length) {
      e.preventDefault();
      elements[nextIndex].focus();
      if (elements[nextIndex] instanceof HTMLInputElement) {
        (elements[nextIndex] as HTMLInputElement).select();
      }
    }
  };

  if (e.key === 'ArrowDown') {
    moveFocus(1);
  } else if (e.key === 'ArrowUp') {
    moveFocus(-1);
  } else if (e.key === 'ArrowRight') {
    if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search' || target.type === 'tel' || target.type === 'url')) {
      if (target.selectionStart === target.value.length) moveFocus(1);
    } else {
      moveFocus(1);
    }
  } else if (e.key === 'ArrowLeft') {
    if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search' || target.type === 'tel' || target.type === 'url')) {
      if (target.selectionStart === 0) moveFocus(-1);
    } else {
      moveFocus(-1);
    }
  }

  // F10 to submit form
  if (e.key === 'F10') {
    e.preventDefault();
    e.stopPropagation();
    form.requestSubmit();
  }
}

// ─── Shared PLS Computation ────────────────────────────────────────────────────
// Single source of truth. Pass settings.plsOverrides so edits on the PLS screen
// propagate to Dashboard, BalanceSheet, and Stock automatically.
export interface FuelStats {
  purchase: { qty: number; avg: number; amt: number };
  sale:     { qty: number; avg: number; amt: number };
  stock:    { qty: number; avg: number; amt: number };
}

export function computeFuelStats(
  type: 'HSD' | 'PMG',
  purchases: Array<{ type: string; date: string; quantity?: number; totalAmount?: number }>,
  sales: Array<{ type: string; date: string; quantity?: number; amount?: number }>,
  overrides: Record<string, number> = {},
  startDate = '',
  endDate = '',
  adjustments: { pur?: number; sal?: number; stock?: number; baseRate?: number } = {}
): FuelStats {
  const t = type.toLowerCase();
  const p = purchases.filter(x =>
    x.type === type && (!startDate || x.date >= startDate) && (!endDate || x.date <= endDate)
  );
  const s = sales.filter(x =>
    x.type === type && (!startDate || x.date >= startDate) && (!endDate || x.date <= endDate)
  );

  const pQtyCalc = p.reduce((sum, x) => sum + (x.quantity    || 0), 0);
  const pAmtCalc = p.reduce((sum, x) => sum + (x.totalAmount || 0), 0);
  
  // Apply Purchase Adjustment
  const pQty = (overrides[`pur_${t}_qty`] ?? pQtyCalc) + (adjustments.pur || 0);
  const pAvg = overrides[`pur_${t}_avg`] ?? (pQtyCalc > 0 ? pAmtCalc / pQtyCalc : (adjustments.baseRate || 0));
  const pAmt = pQty * pAvg;

  const sQtyCalc = s.reduce((sum, x) => sum + (x.quantity || 0), 0);
  const sAmtCalc = s.reduce((sum, x) => sum + (x.amount   || 0), 0);
  
  // Apply Sale Adjustment
  const sQty = (overrides[`sal_${t}_qty`] ?? sQtyCalc) + (adjustments.sal || 0);
  const sAvg = overrides[`sal_${t}_avg`] ?? (sQtyCalc > 0 ? sAmtCalc / sQtyCalc : 0);
  const sAmt = sQty * sAvg;

  // Apply Stock Adjustment
  const stockQty = (pQty - sQty) + (adjustments.stock || 0);
  
  return {
    purchase: { qty: pQty, avg: pAvg, amt: pAmt },
    sale:     { qty: sQty, avg: sAvg, amt: sAmt },
    stock:    { qty: stockQty, avg: pAvg, amt: stockQty * pAvg },
  };
}
