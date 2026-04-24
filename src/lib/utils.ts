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
