import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff, Tag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import FAB from '../components/ui/FAB';
import MobileActivityCard from '../components/ui/MobileActivityCard';

// const PER_PAGE = 40; // Replaced by state

export default function ExpensePage() {
  const { 
    expenseCategories, expenseEntries, 
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
    addExpenseEntry, deleteExpenseEntry, settings, currentUser, updateExpenseEntry 
  } = useStore();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'analytics' | 'entries' | 'register' | 'manage'>('analytics');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [manageSearch, setManageSearch] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '' });

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [form, setForm] = useState({ date: today(), details: '', amount: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
    else if (tab === 'analytics') setActiveTab('analytics');
    else if (tab === 'entries') setActiveTab('entries');
    else if (tab === 'manage') setActiveTab('manage');
  }, [searchParams]);

  useEffect(() => {
    if (!selectedCat && expenseCategories.length > 0) setSelectedCat(expenseCategories[0].id);
  }, [expenseCategories, selectedCat]);

  const cat = expenseCategories.find((c) => c.id === selectedCat);

  const catEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(expenseEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.details?.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenseEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const dashStats = useMemo(() => {
    const all = filterByStartDate(expenseEntries, settings.startDate);
    const globalTotal = all.reduce((s, e) => s + e.amount, 0);
    const catTotals = expenseCategories.map(c => {
      const total = all.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0);
      return { ...c, total };
    }).sort((a, b) => b.total - a.total);
    return { globalTotal, catTotals };
  }, [expenseEntries, expenseCategories, settings.startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) { toast('Fill required fields', 'error'); return; }
    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateExpenseEntry(editingEntity.id, { ...form, amount: parseFloat(form.amount), categoryId: selectedCat });
        toast('Updated successfully', 'success');
      } else {
        await addExpenseEntry({ ...form, amount: parseFloat(form.amount), categoryId: selectedCat });
        toast('Entry added', 'success');
      }
      closeForm();
    } catch (err) {
      toast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => { setShowEntryForm(false); setEditingEntity(null); setForm({ date: today(), details: '', amount: '' }); };

  const handleEdit = (e: any) => { setEditingEntity(e); setForm({ date: e.date, details: e.details || '', amount: e.amount.toString() }); setShowEntryForm(true); setViewingEntity(null); };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden text-slate-900 dark:text-white">
      {/* ── Sub Header — Tabs ── */}
      <div className="px-4 pt-4 pb-2 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 shrink-0">
        <div className="segmented-control overflow-x-auto no-scrollbar">
          {(['analytics', 'entries', 'register', 'manage'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={cn("segmented-item", activeTab === t ? "segmented-item-active" : "segmented-item-inactive")}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab === 'analytics' ? (
          <div className="p-4 space-y-6">
            <div className="glass-card !bg-red-600 border-none shadow-red-600/30">
               <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">TOTAL EXPENSES</p>
               <h2 className="text-4xl font-[900] text-white">₨ {formatCurrency(dashStats.globalTotal)}</h2>
               <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{expenseCategories.length} CATEGORIES</span>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{expenseEntries.length} TRANSACTIONS</span>
               </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CATEGORY ANALYSIS</h3>
              {dashStats.catTotals.map(c => (
                <div key={c.id} onClick={() => { setSelectedCat(c.id); setActiveTab('entries'); }} className="glass-card flex items-center justify-between active:scale-[0.98] transition-transform">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center border border-red-100 dark:border-red-900/20">
                         <Tag className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                         <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{c.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">₨ {formatCurrency(c.total)}</p>
                      </div>
                   </div>
                   <div className="text-right flex flex-col items-end">
                      <div className="h-1.5 w-24 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden">
                         <div className="h-full bg-red-500 rounded-full" style={{ width: `${(c.total / (dashStats.globalTotal || 1)) * 100}%` }} />
                      </div>
                      <p className="text-[9px] font-black text-red-600 mt-1 uppercase">{((c.total / (dashStats.globalTotal || 1)) * 100).toFixed(1)}%</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'entries' ? (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-white dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 space-y-3 shrink-0">
               <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {expenseCategories.map(c => (
                    <button key={c.id} onClick={() => setSelectedCat(c.id)} className={cn("shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", selectedCat === c.id ? "bg-red-600 text-white shadow-lg" : "bg-white dark:bg-dark-800 text-slate-500 border border-slate-200 dark:border-dark-700")}>
                      {c.name}
                    </button>
                  ))}
               </div>
               <SearchBar value={search} onChange={setSearch} placeholder="SEARCH EXPENSES..." fullWidth />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-dark-800">
               {catEntries.map(e => (
                 <MobileActivityCard key={e.id} title={e.details || 'General Expense'} subtitle={formatDate(e.date)} amount={`₨ ${formatCurrency(e.amount)}`} date={cat?.name || ''} icon={Wallet} iconColor="text-red-500" onClick={() => setViewingEntity(e)} />
               ))}
               {catEntries.length === 0 && <div className="py-20 text-center uppercase text-[10px] font-black text-slate-400 tracking-widest">No entries found</div>}
            </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="p-6">
            <div className="glass-card space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight">New Category</h2>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-red-600 uppercase tracking-widest px-1">Name</label>
                   <input className="input w-full !h-12" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. ELECTRICITY BILL" required dir="auto" />
                </div>
                <button type="submit" className="w-full py-4 bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">
                  REGISTER ACCOUNT
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <SearchBar value={manageSearch} onChange={setManageSearch} placeholder="FILTER ACCOUNTS..." fullWidth />
            <div className="space-y-2">
              {expenseCategories.filter(c => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())).map(c => (
                <div key={c.id} className="glass-card flex items-center justify-between py-3">
                   {editingId === c.id ? (
                     <div className="flex-1 flex gap-2">
                        <input className="input flex-1 !h-10" value={editForm.name} onChange={e => setEditForm({ name: e.target.value })} autoFocus dir="auto" />
                        <button onClick={() => handleSaveEdit(c.id)} className="p-2 text-emerald-600"><Check className="w-5 h-5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
                     </div>
                   ) : (
                     <>
                        <span className="font-black text-sm uppercase">{c.name}</span>
                        <div className="flex items-center gap-1">
                           <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name }); }} className="p-2 text-slate-400"><Edit2 className="w-4 h-4" /></button>
                           {currentUser?.role === 'Admin' && <button onClick={() => { if(confirm('Delete account?')) deleteExpenseCategory(c.id); }} className="p-2 text-red-400"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                     </>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEntryForm && (
        <Modal title={editingEntity ? `EDIT ${cat?.name}` : `ADD ${cat?.name}`} onClose={closeForm} variant="bottom-sheet">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label><input type="date" className="input w-full !h-12" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Note</label><input className="input w-full !h-12" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="DETAILS..." dir="auto" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-red-600 uppercase tracking-widest px-1">Amount</label><input type="number" step="any" className="input w-full !h-12 !text-2xl !text-red-600" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /></div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">
              {isSaving ? 'SAVING...' : 'CONFIRM EXPENSE'}
            </button>
          </form>
        </Modal>
      )}

      {(activeTab === 'analytics' || activeTab === 'entries') && (
        <FAB icon={Plus} onClick={() => { if(expenseCategories.length === 0) setActiveTab('register'); else setShowEntryForm(true); }} label="NEW" className="!bg-red-600 shadow-red-600/40" />
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="expense" onClose={() => setViewingEntity(null)} onEdit={handleEdit} onDelete={() => deleteExpenseEntry(viewingEntity.id)} />}
      {showReport && <PrintReportModal data={catEntries} type="expense" onClose={() => setShowReport(false)} />}
    </div>
  );
  function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) return;
    if (expenseCategories.some(c => c.id !== id && c.name.toLowerCase() === editForm.name.trim().toLowerCase())) { toast('Already exists', 'error'); return; }
    updateExpenseCategory(id, editForm.name.trim()); setEditingId(null); toast('Updated', 'success');
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault(); if (!newName.trim()) return;
    if (expenseCategories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) { toast('Already exists', 'error'); return; }
    addExpenseCategory(newName.trim()); setNewName(''); toast('Category registered', 'success'); setActiveTab('analytics');
  }
}
