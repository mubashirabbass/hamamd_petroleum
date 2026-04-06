import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import FuelTypeModal from '../components/modals/FuelTypeModal';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import type { FuelType } from '../store/useStore';

const PER_PAGE = 10;

export default function SalePage() {
  const { sales, addSale, deleteSale } = useStore();
  const { toast } = useToast();

  const [showFuelModal, setShowFuelModal] = useState(true);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ date: today(), quantity: '', rate: '', amount: '' });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type); setShowFuelModal(false); setSearch(''); setPage(1);
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    const rate = parseFloat(k === 'rate' ? v : updated.rate) || 0;
    const qty  = parseFloat(k === 'quantity' ? v : updated.quantity) || 0;
    setForm({ ...updated, amount: (rate * qty).toFixed(2) });
  };

  const filtered = useMemo(() => {
    if (!fuelType) return [];
    return sales
      .filter((s) => s.type === fuelType)
      .filter((s) => !search || s.date.includes(search));
  }, [sales, fuelType, search]);

  const paged = paginate(filtered, page, PER_PAGE);
  const pageTotal = paged.reduce((s, x) => s + x.amount, 0);
  const grandTotal = filtered.reduce((s, x) => s + x.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelType || !form.date || !form.quantity || !form.rate) { toast('Fill required fields', 'error'); return; }
    addSale({ type: fuelType, date: form.date, quantity: parseFloat(form.quantity), rate: parseFloat(form.rate), amount: parseFloat(form.amount) });
    toast(`${fuelType} sale added`, 'success');
    setForm({ date: today(), quantity: '', rate: '', amount: '' });
    setShowForm(false);
  };

  return (
    <div className="animate-fade-in">
      {showFuelModal && <FuelTypeModal title="Select Sale Type" onSelect={handleFuelSelect} onClose={() => setShowFuelModal(false)} />}

      {showForm && fuelType && (
        <Modal title={`Add ${fuelType} Sale`} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
            <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
            <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
            <div><label className="label">Amount</label><input className="input cursor-not-allowed text-primary-600 dark:text-primary-400 font-semibold" value={form.amount} readOnly /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add Sale</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sale</h1>
            {fuelType && <span className={fuelType === 'HSD' ? 'badge-hsd' : 'badge-pmg'}>{fuelType}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFuelModal(true)} className="btn-secondary">Switch Type</button>
          {fuelType && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Sale</button>}
        </div>
      </div>

      {fuelType ? (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-700/50">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search sales..." />
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500 dark:text-dark-400">Page Total: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₨ {formatCurrency(pageTotal)}</span></span>
              <span className="text-slate-500 dark:text-dark-400">Grand Total: <span className="text-slate-900 dark:text-white font-semibold">₨ {formatCurrency(grandTotal)}</span></span>
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
                  <tr key={s.id} className="table-row">
                    <td className="table-cell">{formatDate(s.date)}</td>
                    <td className="table-cell text-right">{s.quantity.toLocaleString()}</td>
                    <td className="table-cell text-right">₨ {formatCurrency(s.rate)}</td>
                    <td className="table-cell text-right font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(s.amount)}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => { deleteSale(s.id); toast('Sale deleted', 'warning'); }}
                        className="text-slate-400 dark:text-dark-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-dark-500">
          <TrendingUp className="w-12 h-12 mb-3 opacity-20 dark:opacity-30" />
          <p>Select a fuel type to view sales</p>
          <button onClick={() => setShowFuelModal(true)} className="btn-primary mt-4">Select Type</button>
        </div>
      )}
    </div>
  );
}
