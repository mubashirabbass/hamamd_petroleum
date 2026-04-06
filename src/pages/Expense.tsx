import { useState, useMemo, useEffect } from 'react';
import { Plus, DollarSign, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import ManageCategoriesModal from '../components/modals/ManageCategoriesModal';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

const PER_PAGE = 10;

export default function ExpensePage() {
  const { 
    expenseCategories, expenseEntries, 
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
    addExpenseEntry, deleteExpenseEntry, settings, currentUser 
  } = useStore();
  const { toast } = useToast();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ date: today(), details: '', amount: '' });

  useEffect(() => {
    if (!selectedCat && expenseCategories.length > 0) {
      setSelectedCat(expenseCategories[0].id);
    }
  }, [expenseCategories, selectedCat]);

  const cat = expenseCategories.find((c) => c.id === selectedCat);

  const catEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(expenseEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.details.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [expenseEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const paged = paginate(catEntries, page, PER_PAGE);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) { toast('Fill required fields', 'error'); return; }
    addExpenseEntry({ categoryId: selectedCat, date: form.date, details: form.details, amount: parseFloat(form.amount) || 0 });
    toast('Expense added', 'success');
    setForm({ date: today(), details: '', amount: '' });
    setShowEntryForm(false);
  };

  const total = catEntries.reduce((s, e) => s + e.amount, 0);
  const pageTotal = paged.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="animate-fade-in flex gap-4 h-full">
      {/* Category Sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col h-[calc(100vh-140px)] gap-3 font-bold">
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-dark-700/50 bg-primary-500/5 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
              Expense Types
            </h2>
            <button 
              onClick={() => setShowManageModal(true)}
              className="px-2 py-1 rounded-lg bg-primary-600 text-white text-[10px] font-bold hover:bg-primary-500 transition-colors shadow-lg shadow-primary-600/20"
            >
              Manage
            </button>
          </div>
          
          <div className="smart-scroll flex-1 p-2 space-y-1">
            {expenseCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">No types registered</div>
            ) : (
              expenseCategories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all duration-200 border border-transparent',
                    selectedCat === c.id 
                      ? 'bg-primary-600/10 text-primary-600 border-primary-600/10 shadow-sm shadow-primary-600/5 relative overflow-hidden' 
                      : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-200 dark:hover:border-dark-700/50'
                  )}
                >
                   {selectedCat === c.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-600 rounded-r-full"></span>}
                   <div className="flex items-center gap-2 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedCat === c.id ? 'bg-primary-600 animate-pulse' : 'bg-slate-300 dark:bg-dark-600'}`}></span>
                      <span className="truncate">{c.name}</span>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {showEntryForm && (
          <Modal title={`Add Expense — ${cat?.name}`} onClose={() => setShowEntryForm(false)}>
            <form onSubmit={handleAddEntry} className="space-y-3">
              <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div><label className="label">Amount (₨) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /></div>
              <div><label className="label">Details</label><textarea className="input min-h-[100px]" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Transaction notes..." /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEntryForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add Expense</button>
              </div>
            </form>
          </Modal>
        )}

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 dark:bg-red-600/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Business Expenses</h1>
              {cat && <span className="text-xs text-slate-500 dark:text-dark-400 font-bold uppercase tracking-wider">{cat.name}</span>}
            </div>
          </div>
          {selectedCat && (
            <button onClick={() => setShowEntryForm(true)} className="btn-primary !bg-red-600 hover:!bg-red-500 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Expense
            </button>
          )}
        </div>

        {selectedCat ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="glass p-5 rounded-2xl border-l-4 border-red-500 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Category Expense</p>
                <p className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums">₨ {formatCurrency(total)}</p>
              </div>
              <div className="glass p-5 rounded-2xl border-l-4 border-slate-400 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Current Period Expense</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(pageTotal)}</p>
              </div>
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
                <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search expenses..." /></div>
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
                    <th className="table-cell text-left">Description/Details</th>
                    <th className="table-cell text-right">Amount (₨)</th>
                    <th className="table-cell"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                    {paged.length === 0 ? (
                      <tr><td colSpan={4} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No expenses found for this category</td></tr>
                    ) : paged.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell whitespace-nowrap text-xs text-slate-500">{formatDate(e.date)}</td>
                        <td className="table-cell text-slate-600 dark:text-dark-300 min-w-[300px] font-medium">{e.details || '—'}</td>
                        <td className="table-cell text-right font-black text-red-600 dark:text-red-400 text-sm">₨ {formatCurrency(e.amount)}</td>
                        <td className="table-cell text-right">
                          {currentUser?.role === 'Admin' && (
                            <button onClick={() => { if(confirm('Delete this expense?')) { deleteExpenseEntry(e.id); toast('Expense deleted', 'warning'); } }} className="text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={catEntries.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 dark:text-dark-500 animate-fade-in opacity-40">
            <DollarSign className="w-16 h-16 mb-4" />
            <p className="font-medium">Select an expense type from the left</p>
          </div>
        )}
      </div>

      <ManageCategoriesModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Expense Types"
        categories={expenseCategories}
        onAdd={addExpenseCategory}
        onUpdate={updateExpenseCategory}
        onDelete={(id) => { deleteExpenseCategory(id); if (selectedCat === id) setSelectedCat(null); }}
      />
    </div>
  );
}
