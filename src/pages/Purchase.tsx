import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import FuelTypeModal from '../components/modals/FuelTypeModal';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import type { FuelType } from '../store/useStore';

const PER_PAGE = 10;

export default function PurchasePage() {
  const { purchases, addPurchase, deletePurchase } = useStore();
  const { toast } = useToast();

  const [showFuelModal, setShowFuelModal] = useState(true);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Form state
  const [form, setForm] = useState({
    date: today(), details: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '',
  });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type);
    setShowFuelModal(false);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!fuelType) return [];
    return purchases
      .filter((p) => p.type === fuelType)
      .filter((p) =>
        !search || p.details.toLowerCase().includes(search.toLowerCase()) || p.date.includes(search)
      );
  }, [purchases, fuelType, search]);

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
    if (!fuelType || !form.date || !form.rate || !form.quantity) {
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

  const pageTotal = paged.reduce((s, p) => s + p.totalAmount, 0);
  const grandTotal = filtered.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="animate-fade-in">
      {showFuelModal && (
        <FuelTypeModal
          title="Select Purchase Type"
          onSelect={handleFuelSelect}
          onClose={() => {
            if (!fuelType) setShowFuelModal(false);
            else setShowFuelModal(false);
          }}
        />
      )}

      {showForm && fuelType && (
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Purchase</h1>
            {fuelType && <span className={fuelType === 'HSD' ? 'badge-hsd' : 'badge-pmg'}>{fuelType}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFuelModal(true)} className="btn-secondary">Switch Type</button>
          {fuelType && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Purchase</button>}
        </div>
      </div>

      {fuelType ? (
        <div className="glass rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-700/50">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search purchases..." />
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500 dark:text-dark-400">Page Total: <span className="text-primary-600 dark:text-primary-400 font-semibold">₨ {formatCurrency(pageTotal)}</span></span>
              <span className="text-slate-500 dark:text-dark-400">Grand Total: <span className="text-slate-900 dark:text-white font-semibold">₨ {formatCurrency(grandTotal)}</span></span>
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
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-dark-500">
          <ShoppingCart className="w-12 h-12 mb-3 opacity-20 dark:opacity-30" />
          <p>Select a fuel type to view purchases</p>
          <button onClick={() => setShowFuelModal(true)} className="btn-primary mt-4">Select Type</button>
        </div>
      )}
    </div>
  );
}
