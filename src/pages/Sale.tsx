import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Droplet, Eye, Edit2, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import type { FuelType } from '../store/useStore';

const PER_PAGE = 10;

export default function SalePage() {
  const { sales, addSale, deleteSale, settings, currentUser } = useStore();
  const { toast } = useToast();

  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState({ date: today(), quantity: '', rate: '', amount: '' });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type); setSearch(''); setPage(1);
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    const rate = parseFloat(k === 'rate' ? v : updated.rate) || 0;
    const qty  = parseFloat(k === 'quantity' ? v : updated.quantity) || 0;
    setForm({ ...updated, amount: (rate * qty).toFixed(2) });
  };

  const filtered = useMemo(() => {
    return filterByStartDate(sales, settings.startDate)
      .filter((s) => s.type === fuelType)
      .filter((s) => {
        const matchesSearch = !search || s.date.includes(search);
        const matchesFrom = !fromDate || s.date >= fromDate;
        const matchesTo   = !toDate   || s.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [sales, settings.startDate, fuelType, search, fromDate, toDate]);

  const paged = paginate(filtered, page, PER_PAGE);
  const pageTotals = useMemo(() => ({
    qty: paged.reduce((s, x) => s + x.quantity, 0),
    amount: paged.reduce((s, x) => s + x.amount, 0),
  }), [paged]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.quantity || !form.rate) { toast('Fill required fields', 'error'); return; }
    
    const payload = { type: fuelType, date: form.date, quantity: parseFloat(form.quantity), rate: parseFloat(form.rate), amount: parseFloat(form.amount) };
    
    if (editingEntity) {
      useStore.getState().updateSale(editingEntity.id, payload);
      toast('Sale updated successfully', 'success');
      closeForm(); // Close after edit
    } else {
      addSale(payload);
      toast(`${fuelType} sale added`, 'success');
      resetFormForNext(); // Stay open after add
    }
  };

  const resetFormForNext = () => {
    setEditingEntity(null);
    setForm(prev => ({ ...prev, quantity: '', rate: '', amount: '' }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntity(null);
    setForm({ date: today(), quantity: '', rate: '', amount: '' });
  };

  const handleEdit = (s: any) => {
    setEditingEntity(s);
    setForm({
      date: s.date,
      quantity: s.quantity.toString(),
      rate: s.rate.toString(),
      amount: s.amount.toString(),
    });
    setShowForm(true);
  };

  return (
    <div className="animate-fade-in flex gap-4 h-full">
      {/* Category Sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 h-[calc(100vh-140px)]">
        <div className="category-panel flex-1 overflow-y-auto custom-scrollbar text-left">
          <div className="px-3 py-2">
            <h2 className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em]">Fuel Types</h2>
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

      <div className="flex-1 min-w-0">
        {showForm && (
          <Modal title={editingEntity ? `Edit ${fuelType} Sale` : `Add ${fuelType} Sale`} onClose={closeForm}>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
              <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
              <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
              <div><label className="label">Amount</label><input className="input cursor-not-allowed text-primary-600 dark:text-primary-400 font-semibold" value={form.amount} readOnly /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary-emerald"><Plus className="w-4 h-4" /> {editingEntity ? 'Update Sale' : 'Add Sale'}</button>
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
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
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

        <div className="glass rounded-xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50">
            <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." /></div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase">From</span>
                <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase">To</span>
                <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
              </div>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="text-[10px] font-bold text-primary-600 hover:underline px-1">Clear</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="table-header">
                <th className="table-cell text-left">Date</th>
                <th className="table-cell text-right">Qty (L)</th>
                <th className="table-cell text-right">Rate (₨)</th>
                <th className="table-cell text-right">Amount (₨)</th>
                <th className="table-cell"></th>
              </tr></thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={5} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12">No {fuelType} sales found</td></tr>
                ) : paged.map((s) => (
                  <tr key={s.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="table-cell">{formatDate(s.date)}</td>
                    <td className="table-cell text-right">{s.quantity.toLocaleString()}</td>
                    <td className="table-cell text-right">₨ {formatCurrency(s.rate)}</td>
                    <td className="table-cell text-right font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(s.amount)}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <tfoot className="bg-slate-50/50 dark:bg-dark-800/50 font-semibold border-t-[3px] border-double border-slate-300 dark:border-dark-600">
                  <tr>
                    <td className="table-cell text-right text-xs uppercase tracking-wider text-slate-500 py-3">Page Totals:</td>
                    <td className="table-cell text-right text-slate-900 dark:text-white font-bold py-3">{pageTotals.qty.toLocaleString()} L</td>
                    <td className="table-cell text-right text-slate-900 dark:text-white font-bold py-3">—</td>
                    <td className="table-cell text-right text-emerald-600 dark:text-emerald-400 font-bold py-3">₨ {formatCurrency(pageTotals.amount)}</td>
                    <td className="table-cell"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
