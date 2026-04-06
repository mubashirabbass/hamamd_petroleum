import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import type { FuelType } from '../store/useStore';

const PER_PAGE = 10;

export default function PurchasePage() {
// ... existing state ...
  const { purchases, addPurchase, deletePurchase } = useStore();
  const { toast } = useToast();

  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Form state
  const [form, setForm] = useState({
    date: today(), details: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '',
  });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    return purchases
      .filter((p) => p.type === fuelType)
      .filter((p) => {
        const matchesSearch = !search || p.details.toLowerCase().includes(search.toLowerCase()) || p.date.includes(search);
        const matchesFrom = !fromDate || p.date >= fromDate;
        const matchesTo   = !toDate   || p.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [purchases, fuelType, search, fromDate, toDate]);

  const paged = paginate(filtered, page, PER_PAGE);

  // Auto-calc amount and total
  const handleRateQty = (f: typeof form) => {
    const rate = parseFloat(f.rate) || 0;
    const qty  = parseFloat(f.quantity) || 0;
    const carr = parseFloat(f.carriage) || 0;
    const amount = rate * qty;
    const totalAmount = amount + carr;
    return { ...f, amount: amount.toFixed(2), totalAmount: totalAmount.toFixed(2) };
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    setForm(handleRateQty(updated));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.rate || !form.quantity) {
      toast('Please fill required fields', 'error');
      return;
    }
    addPurchase({
      type: fuelType,
      date: form.date,
      details: form.details,
      rate: parseFloat(form.rate),
      quantity: parseFloat(form.quantity),
      carriage: parseFloat(form.carriage) || 0,
      amount: parseFloat(form.amount),
      totalAmount: parseFloat(form.totalAmount),
    });
    toast(`${fuelType} purchase added successfully`, 'success');
    setForm({ date: today(), details: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '' });
    setShowForm(false);
  };

  const pageTotals = useMemo(() => ({
    qty: paged.reduce((s, p) => s + p.quantity, 0),
    carriage: paged.reduce((s, p) => s + p.carriage, 0),
    amount: paged.reduce((s, p) => s + p.amount, 0),
    total: paged.reduce((s, p) => s + p.totalAmount, 0),
  }), [paged]);

  const grandTotal = filtered.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="animate-fade-in flex gap-4 h-full">
      {/* Sidebar selection */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 h-[calc(100vh-140px)]">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Purchase
        </button>

        <div className="category-panel flex-1 overflow-y-auto custom-scrollbar">
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
                 <span className="truncate">{t} Purchases</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {showForm && (
          <Modal title={`Add ${fuelType} Purchase`} onClose={() => setShowForm(false)} wide>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
                <div><label className="label">Details</label><input className="input" value={form.details} onChange={(e) => set('details', e.target.value)} placeholder="Supplier / Notes" /></div>
                <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
                <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
                <div><label className="label">Carriage (₨)</label><input type="number" step="0.01" className="input" value={form.carriage} onChange={(e) => set('carriage', e.target.value)} /></div>
                <div><label className="label">Amount</label><input className="input bg-slate-50 dark:bg-dark-750 cursor-not-allowed" value={form.amount} readOnly /></div>
                <div className="col-span-2"><label className="label">Total Amount</label><input className="input bg-slate-50 dark:bg-dark-750 text-primary-600 dark:text-primary-400 font-semibold cursor-not-allowed" value={form.totalAmount} readOnly /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add Purchase</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-icon" title="Back to Dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Purchase</h1>
                <span className={fuelType === 'HSD' ? 'badge-hsd' : 'badge-pmg'}>{fuelType}</span>
              </div>
            </div>
          </div>
        </div>

         <div className="glass rounded-xl overflow-hidden">
           {/* Toolbar */}
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="table-header">
                <th className="table-cell text-left">Date</th>
                <th className="table-cell text-left">Details</th>
                <th className="table-cell text-right">Rate</th>
                <th className="table-cell text-right">Qty (L)</th>
                <th className="table-cell text-right">Carriage</th>
                <th className="table-cell text-right">Amount</th>
                <th className="table-cell text-right">Total</th>
                <th className="table-cell"></th>
              </tr></thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12">No {fuelType} purchases found</td></tr>
                ) : paged.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell">{formatDate(p.date)}</td>
                    <td className="table-cell text-slate-600 dark:text-dark-300">{p.details || '—'}</td>
                    <td className="table-cell text-right">₨ {formatCurrency(p.rate)}</td>
                    <td className="table-cell text-right">{p.quantity.toLocaleString()}</td>
                    <td className="table-cell text-right">₨ {formatCurrency(p.carriage)}</td>
                    <td className="table-cell text-right">₨ {formatCurrency(p.amount)}</td>
                    <td className="table-cell text-right font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(p.totalAmount)}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => { deletePurchase(p.id); toast('Purchase deleted', 'warning'); }}
                        className="text-slate-400 dark:text-dark-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                 </tr>
               ))}
             </tbody>
             {paged.length > 0 && (
               <tfoot className="bg-slate-50/50 dark:bg-dark-800/50 font-semibold border-t border-slate-200 dark:border-dark-700/50">
                 <tr>
                   <td colSpan={3} className="table-cell text-right text-xs uppercase tracking-wider text-slate-500">Page Totals:</td>
                   <td className="table-cell text-right text-slate-900 dark:text-white">{pageTotals.qty.toLocaleString()} L</td>
                   <td className="table-cell text-right text-slate-900 dark:text-white">₨ {formatCurrency(pageTotals.carriage)}</td>
                   <td className="table-cell text-right text-slate-900 dark:text-white">₨ {formatCurrency(pageTotals.amount)}</td>
                   <td className="table-cell text-right text-primary-600 dark:text-primary-400">₨ {formatCurrency(pageTotals.total)}</td>
                   <td className="table-cell"></td>
                 </tr>
                 <tr className="bg-primary-50/30 dark:bg-primary-900/10 border-t border-primary-100/50 dark:border-primary-800/10">
                   <td colSpan={6} className="table-cell text-right text-xs uppercase tracking-wider text-primary-600/70 dark:text-primary-400/70">Filtered Grand Total:</td>
                   <td className="table-cell text-right font-bold text-primary-600 dark:text-primary-400">₨ {formatCurrency(grandTotal)}</td>
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
