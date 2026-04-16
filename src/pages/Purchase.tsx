import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ShoppingCart, Eye, Edit2, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import type { FuelType } from '../store/useStore';

export default function PurchasePage() {
  const { purchases, addPurchase, deletePurchase, settings, currentUser } = useStore();
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
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: today(), description: '', invoiceNo: '', vehicleNo: '', details: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '',
  });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    return filterByStartDate(purchases, settings.startDate)
      .filter((p) => p.type === fuelType)
      .filter((p) => {
        const matchesSearch = !search || p.details.toLowerCase().includes(search.toLowerCase()) || p.date.includes(search);
        const matchesFrom = !fromDate || p.date >= fromDate;
        const matchesTo = !toDate || p.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [purchases, settings.startDate, fuelType, search, fromDate, toDate]);

  const paged = paginate(filtered, page, perPage);

  // Auto-calc amount and total
  const handleRateQty = (f: typeof form) => {
    const rate = parseFloat(f.rate) || 0;
    const qty = parseFloat(f.quantity) || 0;
    const carr = parseFloat(f.carriage) || 0;
    const amount = rate * qty;
    const totalAmount = amount + carr;
    return { ...f, amount: amount.toFixed(2), totalAmount: totalAmount.toFixed(2) };
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    setForm(handleRateQty(updated));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.rate || !form.quantity) {
      toast('Please fill required fields', 'error');
      return;
    }
    const payload = {
      type: fuelType,
      date: form.date,
      description: form.description,
      invoiceNo: form.invoiceNo,
      vehicleNo: form.vehicleNo,
      details: form.details,
      rate: parseFloat(form.rate),
      quantity: parseFloat(form.quantity),
      carriage: parseFloat(form.carriage) || 0,
      amount: parseFloat(form.amount),
      totalAmount: parseFloat(form.totalAmount),
    };

    setIsSaving(true);
    try {
      if (editingEntity) {
        await useStore.getState().updatePurchase(editingEntity.id, payload);
        toast('Purchase updated successfully', 'success');
        closeForm(); // Close edit form
      } else {
        await addPurchase(payload);
        toast(`${fuelType} purchase added successfully`, 'success');
        resetFormForNext(); // Stay open
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
    setForm(prev => ({
      ...prev,
      description: '',
      invoiceNo: '',
      vehicleNo: '',
      details: '',
      rate: '',
      quantity: '',
      carriage: '',
      amount: '',
      totalAmount: '',
    }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', invoiceNo: '', vehicleNo: '', details: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '' });
  };

  const handleEdit = (p: any) => {
    setEditingEntity(p);
    setForm({
      date: p.date,
      description: p.description || '',
      invoiceNo: p.invoiceNo || '',
      vehicleNo: p.vehicleNo || '',
      details: p.details || '',
      rate: p.rate.toString(),
      quantity: p.quantity.toString(),
      carriage: p.carriage.toString(),
      amount: p.amount.toString(),
      totalAmount: p.totalAmount.toString(),
    });
    setShowForm(true);
  };

  const pageTotals = useMemo(() => ({
    qty: paged.reduce((s, p) => s + p.quantity, 0),
    carriage: paged.reduce((s, p) => s + p.carriage, 0),
    amount: paged.reduce((s, p) => s + p.amount, 0),
    total: paged.reduce((s, p) => s + p.totalAmount, 0),
  }), [paged]);

  const grandTotals = useMemo(() => ({
    qty: filtered.reduce((s, p) => s + p.quantity, 0),
    carriage: filtered.reduce((s, p) => s + p.carriage, 0),
    amount: filtered.reduce((s, p) => s + p.amount, 0),
    total: filtered.reduce((s, p) => s + p.totalAmount, 0),
  }), [filtered]);

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-4 h-full overflow-hidden">
      {/* Sidebar selection */}
      <div className="w-full md:w-60 flex-shrink-0 flex flex-col gap-3 h-full">
        <div className="category-panel flex-1 overflow-y-auto custom-scrollbar">
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
                <span className="truncate">{t} Purchases</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full">
        {showForm && (
          <Modal title={editingEntity ? `Edit ${fuelType} Purchase` : `Add ${fuelType} Purchase`} onClose={closeForm} wide>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
                </div>
                <div className="col-span-2"><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Purchase order note" /></div>
                <div><label className="label">Invoice No</label><input className="input" value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} placeholder="e.g. INV-202611" /></div>
                <div><label className="label">Vehicle No</label><input className="input" value={form.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} placeholder="e.g. LHR-4567" /></div>
                <div className="col-span-2"><label className="label">Details / Supplier Info</label><input className="input" value={form.details} onChange={(e) => set('details', e.target.value)} placeholder="e.g. PSO Main Depot" /></div>
                <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
                <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
                <div><label className="label">Carriage (₨)</label><input type="number" step="0.01" className="input" value={form.carriage} onChange={(e) => set('carriage', e.target.value)} /></div>
                <div><label className="label">Amount</label><input className="input bg-slate-50 dark:bg-dark-750 cursor-not-allowed" value={form.amount} readOnly /></div>
                <div className="col-span-2"><label className="label">Total Amount</label><input className="input bg-slate-50 dark:bg-dark-750 text-primary-600 dark:text-primary-400 font-semibold cursor-not-allowed" value={form.totalAmount} readOnly /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingEntity ? 'Update Purchase' : 'Add Purchase'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {viewingEntity && (
          <TransactionReceiptModal
            entity={viewingEntity}
            type="purchase"
            onClose={() => setViewingEntity(null)}
          />
        )}

        {showReport && (
          <PrintReportModal
            data={filtered}
            type="purchase"
            onClose={() => setShowReport(false)}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Purchase Entries
                {fuelType && <span className="text-blue-600 dark:text-blue-500 uppercase tracking-widest">{fuelType}</span>}
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
              className="btn-primary !bg-blue-600 hover:!bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/10"
            >
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        </div>

        <div className="glass rounded-xl overflow-hidden flex-1 flex flex-col mb-4">
          {/* Toolbar */}
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

          {/* Table */}
          <div className="flex-1 overflow-auto smart-scroll">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                <tr className="table-header text-[9px]">
                  <th className="table-cell text-left w-24">Date</th>
                  <th className="table-cell text-left w-28">Invoice No</th>
                  <th className="table-cell text-left w-44">Description</th>
                  <th className="table-cell text-left w-28">Vehicle No</th>
                  <th className="table-cell text-left w-52">Details</th>
                  <th className="table-cell text-right w-24">Rate</th>
                  <th className="table-cell text-right w-28">Qty (L)</th>
                  <th className="table-cell text-right w-32">Carriage</th>
                  <th className="table-cell text-right w-36">Amount</th>
                  <th className="table-cell text-right font-black w-40">Total</th>
                  <th className="table-cell w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={11} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No {fuelType} purchases found</td></tr>
                ) : paged.map((p) => (
                  <tr key={p.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[9px]">
                    <td className="table-cell whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="table-cell font-medium text-emerald-600 whitespace-nowrap truncate max-w-[7rem]">{p.invoiceNo || '—'}</td>
                    <td className="table-cell whitespace-normal break-words max-w-[11rem] leading-4 truncate">{p.description || '—'}</td>
                    <td className="table-cell text-slate-500 uppercase tracking-wider whitespace-nowrap truncate max-w-[7rem]">{p.vehicleNo || '—'}</td>
                    <td className="table-cell text-slate-600 dark:text-dark-300 whitespace-normal break-words max-w-[13rem] truncate">{p.details || '—'}</td>
                    <td className="table-cell text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.rate)}</td>
                    <td className="table-cell text-right whitespace-nowrap tabular-nums">{p.quantity.toLocaleString()}</td>
                    <td className="table-cell text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.carriage)}</td>
                    <td className="table-cell text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.amount)}</td>
                    <td className="table-cell text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">₨{formatCurrency(p.totalAmount)}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingEntity(p)}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-emerald-800/30 rounded hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-all"
                          title={`Print Bill`}
                        >
                          <Printer className="w-3 h-3" />
                          <span>PRINT</span>
                        </button>
                        <button onClick={() => setViewingEntity(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <>
                            <button onClick={() => handleEdit(p)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit Entry">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { deletePurchase(p.id); toast('Purchase deleted', 'warning'); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Entry">
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
                <tfoot className="bg-slate-50/50 dark:bg-dark-800/50 border-t-[3px] border-double border-slate-300 dark:border-dark-600">
                  <tr className="bg-slate-200 dark:bg-dark-800 border-t-2 border-slate-400">
                    <td colSpan={6} className="px-2 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-tighter leading-none">Page Total</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-1">Grand Total</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-slate-500 leading-none">{pageTotals.qty.toLocaleString()} L</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white mt-1">{grandTotals.qty.toLocaleString()} L</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-slate-500 leading-none">₨{formatCurrency(pageTotals.carriage)}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white mt-1">₨{formatCurrency(grandTotals.carriage)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-slate-500 leading-none">₨{formatCurrency(pageTotals.amount)}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white mt-1">₨{formatCurrency(grandTotals.amount)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end border-l border-slate-300 dark:border-dark-700 pl-4">
                        <span className="text-lg font-black text-primary-600/70 leading-none">₨{formatCurrency(pageTotals.total)}</span>
                        <span className="text-lg font-black text-primary-600 dark:text-primary-400 mt-1">₨{formatCurrency(grandTotals.total)}</span>
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
