import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Droplet, Eye, Edit2, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import type { FuelType } from '../store/useStore';

export default function SalePage() {
  const { sales, addSale, deleteSale, settings, currentUser } = useStore();
  const { toast } = useToast();
  const [perPage, setPerPage] = useState(20);

  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState({ date: today(), description: '', quantity: '', rate: '', amount: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type); setSearch(''); setPage(1);
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    const rate = parseFloat(k === 'rate' ? v : updated.rate) || 0;
    const qty = parseFloat(k === 'quantity' ? v : updated.quantity) || 0;
    setForm({ ...updated, amount: (rate * qty).toFixed(2) });
  };

  const filtered = useMemo(() => {
    return filterByStartDate(sales, settings.startDate)
      .filter((s) => s.type === fuelType)
      .filter((s) => {
        const matchesSearch = !search || s.date.includes(search);
        const matchesFrom = !fromDate || s.date >= fromDate;
        const matchesTo = !toDate || s.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [sales, settings.startDate, fuelType, search, fromDate, toDate]);

  const paged = paginate(filtered, page, perPage);
  const pageTotals = useMemo(() => ({
    qty: paged.reduce((s, x) => s + x.quantity, 0),
    amount: paged.reduce((s, x) => s + x.amount, 0),
  }), [paged]);

  const grandTotals = useMemo(() => ({
    qty: filtered.reduce((s, x) => s + x.quantity, 0),
    amount: filtered.reduce((s, x) => s + x.amount, 0),
  }), [filtered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.quantity || !form.rate) { toast('Fill required fields', 'error'); return; }

    const payload = {
      type: fuelType,
      date: form.date,
      description: form.description,
      quantity: parseFloat(form.quantity),
      rate: parseFloat(form.rate),
      amount: parseFloat(form.amount)
    };

    setIsSaving(true);
    try {
      if (editingEntity) {
        await useStore.getState().updateSale(editingEntity.id, payload);
        toast('Sale updated successfully', 'success');
        closeForm(); // Close after edit
      } else {
        await addSale(payload);
        toast(`${fuelType} sale added`, 'success');
        resetFormForNext(); // Stay open after add
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('Save error:', err);
      toast(`Failed to save: ${errorMessage}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetFormForNext = () => {
    setEditingEntity(null);
    setForm(prev => ({ ...prev, description: '', quantity: '', rate: '', amount: '' }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', quantity: '', rate: '', amount: '' });
  };

  const handleEdit = (s: any) => {
    setEditingEntity(s);
    setForm({
      date: s.date,
      description: s.description || '',
      quantity: s.quantity.toString(),
      rate: s.rate.toString(),
      amount: s.amount.toString(),
    });
    setShowForm(true);
  };

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-4 h-full overflow-hidden">
      {/* Sidebar selection - Desktop: Sidebar, Mobile: Horizontal Tabs */}
      <div className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-3">
        {/* Mobile View: Horizontal Tabs */}
        <div className="mobile-tab-list lg:hidden">
          {(['HSD', 'PMG'] as FuelType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleFuelSelect(t)}
              className={cn(
                "px-5 py-2.5 rounded-xl whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all border",
                fuelType === t 
                  ? "bg-primary-600 text-white border-primary-600 shadow-md" 
                  : "bg-white dark:bg-dark-800 text-slate-500 border-slate-200 dark:border-dark-700 hover:bg-slate-50"
              )}
            >
              {t} Sales
            </button>
          ))}
        </div>

        {/* Desktop View: Sidebar Panel */}
        <div className="category-panel hidden lg:flex flex-1 overflow-y-auto custom-scrollbar text-left">
          <div className="px-3 py-2">
            <h2 className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-[0.2em]">Fuel Types</h2>
          </div>
          {(['HSD', 'PMG'] as FuelType[]).map((t) => (
            <div
              key={t}
              onClick={() => handleFuelSelect(t)}
              className={fuelType === t ? 'category-item-active' : 'category-item-inactive'}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full ${fuelType === t ? 'bg-primary-600 animate-pulse' : 'bg-slate-300 dark:bg-dark-600'}`}></span>
                <span className="truncate">{t} Sales</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full">
        {showForm && (
          <Modal title={editingEntity ? `Edit ${fuelType} Sale` : `Add ${fuelType} Sale`} onClose={closeForm}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <input className="input" value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Sale details" />
                </div>
                <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" inputMode="decimal" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
                <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" inputMode="decimal" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
                <div className="col-span-2"><label className="label">Calculation (Auto)</label><input className="input cursor-not-allowed text-primary-600 dark:text-primary-400 font-bold" value={`₨ ${form.amount}`} readOnly tabIndex={-1} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary-emerald flex items-center gap-2" disabled={isSaving}>
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingEntity ? 'Update Sale' : 'Add Sale'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {viewingEntity && (
          <TransactionReceiptModal
            entity={viewingEntity}
            type="sale"
            onClose={() => setViewingEntity(null)}
          />
        )}

        {showReport && (
          <PrintReportModal
            data={filtered}
            type="sale"
            onClose={() => setShowReport(false)}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 flex items-center justify-center">
              <Droplet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Sales Entries
                {fuelType && <span className="text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">{fuelType}</span>}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowReport(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-dark-200 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-600 transition-colors font-bold text-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Report
            </button>
            <button
              onClick={() => { closeForm(); setShowForm(true); }}
              className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 flex items-center gap-2 shadow-lg shadow-emerald-600/10"
            >
              <Plus className="w-4 h-4" /> New Sale Entry
            </button>
          </div>
        </div>

        <div className="glass rounded-xl overflow-hidden flex-1 flex flex-col mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50">
            <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." /></div>
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 mr-2">
                <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
                <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
                <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase">From</span>
                <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase">To</span>
                <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
              </div>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30">Clear</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto smart-scroll">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                <tr className="table-header text-[9px]">
                  <th className="table-cell table-sticky-col text-left w-24">Date</th>
                  <th className="table-cell text-left w-64">Description</th>
                  <th className="table-cell text-right w-28">Rate</th>
                  <th className="table-cell text-right w-32">Qty (L)</th>
                  <th className="table-cell text-right font-black w-40">Amount</th>
                  <th className="table-cell w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No {fuelType} sales found</td></tr>
                ) : paged.map((s) => (
                  <tr key={s.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[11px]">
                    <td className="table-cell table-sticky-col whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="table-cell truncate max-w-[15rem]">{s.description || '—'}</td>
                    <td className="table-cell text-right whitespace-nowrap tabular-nums">₨ {formatCurrency(s.rate)}</td>
                    <td className="table-cell text-right whitespace-nowrap tabular-nums">{s.quantity.toLocaleString()} L</td>
                    <td className="table-cell text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">₨ {formatCurrency(s.amount)}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingEntity(s)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-all"
                          title={`Print Bill`}
                        >
                          <Printer className="w-3 h-3" />
                          <span>PRINT</span>
                        </button>
                        <button onClick={() => setViewingEntity(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <>
                            <button onClick={() => handleEdit(s)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit Entry">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { deleteSale(s.id); toast('Sale deleted', 'warning'); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Entry">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {paged.length > 0 && (
                <tfoot className="border-t-[3px] border-black dark:border-black bg-slate-50/50 dark:bg-dark-900/50">
                  <tr className="bg-slate-200 dark:bg-dark-800 border-t-2 border-slate-400">
                    <td colSpan={3} className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-6">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-tighter leading-none">Page Total</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-1">Grand Total</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-slate-500 leading-none">{pageTotals.qty.toLocaleString()} L</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white mt-1">{grandTotals.qty.toLocaleString()} L</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end border-l border-slate-300 dark:border-dark-700 pl-4">
                        <span className="text-lg font-black text-emerald-600/70 leading-none">₨ {formatCurrency(pageTotals.amount)}</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-500 mt-1">₨ {formatCurrency(grandTotals.amount)}</span>
                      </div>
                    </td>
                    <td className="table-cell"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} onPerPageChange={(v) => { setPerPage(v); setPage(1); }} />
        </div>
      </div>
    </div>
  );
}
