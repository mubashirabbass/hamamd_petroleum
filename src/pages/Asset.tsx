import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Package, FolderPlus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

const PER_PAGE = 10;

export default function AssetPage() {
  const { assetCategories, assetEntries, addAssetCategory, deleteAssetCategory, addAssetEntry, deleteAssetEntry, settings, currentUser } = useStore();
  const { toast } = useToast();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  
  useEffect(() => {
    if (!selectedCat && assetCategories.length > 0) {
      setSelectedCat(assetCategories[0].id);
    }
  }, [assetCategories, selectedCat]);

  const cat = assetCategories.find((c) => c.id === selectedCat);

  const filtered = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(assetEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [assetEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const withBalance = useMemo(() => {
    const sorted = [...filtered].reverse();
    let bal = 0;
    return sorted.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; }).reverse();
  }, [filtered]);

  const paged = paginate(withBalance, page, PER_PAGE);
  const totals = { debit: filtered.reduce((s, e) => s + e.debit, 0), credit: filtered.reduce((s, e) => s + e.credit, 0) };
  const pageTotals = { debit: paged.reduce((s, e) => s + e.debit, 0), credit: paged.reduce((s, e) => s + e.credit, 0) };

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { toast('Enter name', 'error'); return; }
    addAssetCategory(catName.trim()); toast('Asset category created', 'success'); setCatName(''); setShowCatForm(false);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date) { toast('Fill required fields', 'error'); return; }
    addAssetEntry({ categoryId: selectedCat, date: form.date, description: form.description, debit: parseFloat(form.debit) || 0, credit: parseFloat(form.credit) || 0, balance: 0 });
    toast('Asset entry added', 'success'); setForm({ date: today(), description: '', debit: '', credit: '' }); setShowEntryForm(false);
  };

  return (
    <div className="animate-fade-in flex gap-4 h-full">
      {/* Category Sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 h-[calc(100vh-140px)]">
        <button
          onClick={() => setShowCatForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-95"
        >
          <FolderPlus className="w-4 h-4" />
          New Category
        </button>

        <div className="category-panel flex-1 overflow-y-auto custom-scrollbar text-left">
          <div className="px-3 py-2">
            <h2 className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em]">Asset Types</h2>
          </div>

          {assetCategories.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-slate-400 dark:text-dark-500 italic">No categories found</p>
            </div>
          ) : (
            assetCategories.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                className={selectedCat === c.id ? 'category-item-active' : 'category-item-inactive'}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                   <span className={`w-1.5 h-1.5 rounded-full ${selectedCat === c.id ? 'bg-primary-600 animate-pulse' : 'bg-slate-300 dark:bg-dark-600'}`}></span>
                   <span className="truncate">{c.name}</span>
                </div>
                {currentUser?.role === 'Admin' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAssetCategory(c.id); if (selectedCat === c.id) setSelectedCat(null); toast('Deleted', 'warning'); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-all p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {showCatForm && <Modal title="New Asset Category" onClose={() => setShowCatForm(false)}><form onSubmit={handleAddCat} className="space-y-3"><div><label className="label">Category Name *</label><input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Vehicle, Equipment" required /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCatForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Create</button></div></form></Modal>}
        {showEntryForm && <Modal title={`Add Entry — ${cat?.name}`} onClose={() => setShowEntryForm(false)}><form onSubmit={handleAddEntry} className="space-y-3"><div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div><div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Debit (₨)</label><input type="number" step="0.01" className="input" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} /></div><div><label className="label">Credit (₨)</label><input type="number" step="0.01" className="input" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></div></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEntryForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Add Entry</button></div></form></Modal>}

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
            <div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Asset</h1>{cat && <span className="text-xs text-slate-500 dark:text-dark-400">{cat.name}</span>}</div>
          </div>
          {selectedCat && <button onClick={() => setShowEntryForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Entry</button>}
        </div>

        {selectedCat ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ label: 'Total Debit', value: totals.debit, color: 'text-red-600 dark:text-red-400' }, { label: 'Total Credit', value: totals.credit, color: 'text-emerald-600 dark:text-emerald-400' }, { label: 'Net Asset', value: totals.debit - totals.credit, color: 'text-blue-600 dark:text-blue-400' }].map((s) => (
                <div key={s.label} className="stat-card"><p className="text-xs text-slate-500 dark:text-dark-400 uppercase tracking-wide">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>₨ {formatCurrency(s.value)}</p></div>
              ))}
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50">
                <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." /></div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                    <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
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
                    <th className="table-cell text-left">Description</th>
                    <th className="table-cell text-right">Debit</th>
                    <th className="table-cell text-right">Credit</th>
                    <th className="table-cell text-right">Balance</th>
                    <th className="table-cell"></th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12">No entries yet</td></tr>
                    ) : paged.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell whitespace-nowrap">{formatDate(e.date)}</td>
                        <td className="table-cell text-slate-600 dark:text-dark-300 min-w-[200px]">{e.description || '—'}</td>
                        <td className="table-cell text-right text-red-600 dark:text-red-400">{e.debit ? `₨ ${formatCurrency(e.debit)}` : '—'}</td>
                        <td className="table-cell text-right text-emerald-600 dark:text-emerald-400">{e.credit ? `₨ ${formatCurrency(e.credit)}` : '—'}</td>
                        <td className="table-cell text-right font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(e.balance)}</td>
                        <td className="table-cell text-right">
                          {currentUser?.role === 'Admin' && (
                            <button onClick={() => { deleteAssetEntry(e.id); toast('Entry deleted', 'warning'); }} className="text-slate-400 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {paged.length > 0 && (
                    <tfoot className="bg-slate-50/50 dark:bg-dark-800/50 font-semibold border-t border-slate-200 dark:border-dark-700/50">
                      <tr>
                        <td colSpan={2} className="table-cell text-right text-xs uppercase tracking-wider text-slate-500">Page Totals:</td>
                        <td className="table-cell text-right text-red-600 dark:text-red-400">₨ {formatCurrency(pageTotals.debit)}</td>
                        <td className="table-cell text-right text-emerald-600 dark:text-emerald-400">₨ {formatCurrency(pageTotals.credit)}</td>
                        <td className="table-cell text-right text-primary-600 dark:text-primary-400">₨ {formatCurrency(pageTotals.debit - pageTotals.credit)}</td>
                        <td className="table-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <Pagination page={page} total={withBalance.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-dark-500"><Package className="w-12 h-12 mb-3 opacity-20 dark:opacity-30" /><p>Select a category from the left</p></div>
        )}
      </div>
    </div>
  );
}
