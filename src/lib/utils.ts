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

  // Don't intercept if typing in a textarea or using a date input (which needs arrows for internal navigation)
  if (target.tagName === 'TEXTAREA') return;
  if (target instanceof HTMLInputElement && target.type === 'date') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
       // Still allow vertical navigation in date fields if preferred, 
       // but browsers use Up/Down to change values. 
       // Let's stay out of date fields for arrows.
       return;
    }
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
      // For numbers and selects, ArrowRight moves to next
      moveFocus(1);
    }
  } else if (e.key === 'ArrowLeft') {
    if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search' || target.type === 'tel' || target.type === 'url')) {
      if (target.selectionStart === 0) moveFocus(-1);
    } else {
      // For numbers and selects, ArrowLeft moves to prev
      moveFocus(-1);
    }
  }
}
