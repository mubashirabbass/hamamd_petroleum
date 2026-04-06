import React, { useState, useMemo } from 'react';
import { Plus, Trash2, DollarSign, FolderPlus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

const PER_PAGE = 10;

export default function ExpensePage() {
  const { expenseCategories, expenseEntries, addExpenseCategory, deleteExpenseCategory, addExpenseEntry, deleteExpenseEntry } = useStore();
  const { toast } = useToast();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ date: today(), details: '', amount: '' });

  const cat = expenseCategories.find((c) => c.id === selectedCat);

  const filtered = useMemo(() => {
    if (!selectedCat) return [];
    return expenseEntries
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.details.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [expenseEntries, selectedCat, search, fromDate, toDate]);

  const paged = paginate(filtered, page, PER_PAGE);
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const pageTotal = paged.reduce((s, e) => s + e.amount, 0);

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { toast('Enter category name', 'error'); return; }
    addExpenseCategory(catName.trim());
    toast('Expense category created', 'success');
    setCatName(''); setShowCatForm(false);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) { toast('Fill required fields', 'error'); return; }
    addExpenseEntry({ categoryId: selectedCat, date: form.date, details: form.details, amount: parseFloat(form.amount) });
    toast('Expense added', 'success');
    setForm({ date: today(), details: '', amount: '' });
    setShowEntryForm(false);
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
            <h2 className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em]">Expense Types</h2>
          </div>

          {expenseCategories.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-slate-400 dark:text-dark-500 italic">No categories found</p>
            </div>
          ) : (
            expenseCategories.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                className={selectedCat === c.id ? 'category-item-active' : 'category-item-inactive'}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                   <span className={`w-1.5 h-1.5 rounded-full ${selectedCat === c.id ? 'bg-primary-600 animate-pulse' : 'bg-slate-300 dark:bg-dark-600'}`}></span>
                   <span className="truncate">{c.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteExpenseCategory(c.id); if (selectedCat === c.id) setSelectedCat(null); toast('Category deleted', 'warning'); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-all p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {showCatForm && (
          <Modal title="New Expense Category" onClose={() => setShowCatForm(false)}>
            <form onSubmit={handleAddCat} className="space-y-3">
              <div><label className="label">Category Name *</label><input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Fuel, Salaries, Utilities" required /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCatForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Create</button></div>
            </form>
          </Modal>
        )}
        {showEntryForm && (
          <Modal title={`Add Expense — ${cat?.name}`} onClose={() => setShowEntryForm(false)}>
            <form onSubmit={handleAddEntry} className="space-y-3">
              <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div><label className="label">Details</label><input className="input" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Description" /></div>
              <div><label className="label">Amount (₨) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEntryForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Add</button></div>
            </form>
          </Modal>
        )}

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 dark:bg-red-600/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
            <div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Expense</h1>{cat && <span className="text-xs text-slate-500 dark:text-dark-400">{cat.name}</span>}</div>
          </div>
          {selectedCat && <button onClick={() => setShowEntryForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Expense</button>}
        </div>

        {selectedCat ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="stat-card"><p className="text-xs text-slate-500 dark:text-dark-400 uppercase tracking-wide">Total Expenses</p><p className="text-lg font-bold text-red-600 dark:text-red-400">₨ {formatCurrency(total)}</p></div>
              <div className="stat-card"><p className="text-xs text-slate-500 dark:text-dark-400 uppercase tracking-wide">Entries</p><p className="text-lg font-bold text-slate-900 dark:text-white">{filtered.length}</p></div>
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
                    <th className="table-cell text-left">Details</th>
                    <th className="table-cell text-right">Amount (₨)</th>
                    <th className="table-cell"></th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={4} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12">No expenses yet</td></tr>
                    ) : paged.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell whitespace-nowrap">{formatDate(e.date)}</td>
                        <td className="table-cell text-slate-600 dark:text-dark-300 min-w-[200px]">{e.details || '—'}</td>
                        <td className="table-cell text-right font-semibold text-red-600 dark:text-red-400">₨ {formatCurrency(e.amount)}</td>
                        <td className="table-cell text-right">
                          <button onClick={() => { deleteExpenseEntry(e.id); toast('Expense deleted', 'warning'); }} className="text-slate-400 dark:text-dark-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {paged.length > 0 && (
                    <tfoot className="bg-slate-50/50 dark:bg-dark-800/50 font-semibold border-t border-slate-200 dark:border-dark-700/50">
                      <tr>
                        <td colSpan={2} className="table-cell text-right text-xs uppercase tracking-wider text-slate-500">Page Total:</td>
                        <td className="table-cell text-right text-red-600 dark:text-red-400">₨ {formatCurrency(pageTotal)}</td>
                        <td className="table-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-dark-500">
            <DollarSign className="w-12 h-12 mb-3 opacity-20 dark:opacity-30" />
            <p>Select a category from the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
