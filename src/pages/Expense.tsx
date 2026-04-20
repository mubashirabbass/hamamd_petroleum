import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, 
  UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff,
  ArrowLeft, ChevronRight, Landmark
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { 
  formatCurrency, formatDate, today, paginate, filterByStartDate, cn, 
  startOfMonth, startOfYear 
} from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import FAB from '../components/ui/FAB';

export default function ExpensePage() {
  const { 
    expenseCategories, expenseEntries, 
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
    addExpenseEntry, deleteExpenseEntry, settings, updateExpenseEntry 
  } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'analytics' | 'entries' | 'register' | 'manage'>('analytics');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashSort, setDashSort] = useState('name_asc');
  const [fromDate, setFromDate] = useState(startOfMonth());
  const [toDate, setToDate] = useState(today());
  
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Registration Form State
  const [newName, setNewName] = useState('');
  
  // Management state
  const [manageSearch, setManageSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '' });

  const [form, setForm] = useState({ date: today(), details: '', amount: '' });

  useEffect(() => {
    if (!selectedCat && expenseCategories.length > 0) {
      setSelectedCat(expenseCategories[0].id);
    }
  }, [expenseCategories, selectedCat]);

  const cat = expenseCategories.find((c) => c.id === selectedCat);

  const stats = useMemo(() => {
    const periodEntries = filterByStartDate(expenseEntries, settings.startDate).filter(e => {
      const matchesFrom = !fromDate || e.date >= fromDate;
      const matchesTo = !toDate || e.date <= toDate;
      return matchesFrom && matchesTo;
    });

    const categoryStats = expenseCategories.map(c => {
      const entries = periodEntries.filter(e => e.categoryId === c.id);
      const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
      return { ...c, total, count: entries.length };
    });

    const totalExpenses = periodEntries.reduce((s, e) => s + (e.amount || 0), 0);

    return { totalExpenses, totalEntries: periodEntries.length, categories: categoryStats };
  }, [expenseCategories, expenseEntries, settings.startDate, fromDate, toDate]);

  const filteredCategories = useMemo(() => {
    return stats.categories
      .filter((c: any) => !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase()))
      .sort((a: any, b: any) => {
        if (dashSort === 'name_asc') return a.name.localeCompare(b.name);
        if (dashSort === 'name_desc') return b.name.localeCompare(a.name);
        if (dashSort === 'total_desc') return b.total - a.total;
        if (dashSort === 'total_asc') return a.total - b.total;
        return 0;
      });
  }, [stats.categories, dashboardSearch, dashSort]);

  const filteredEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(expenseEntries, settings.startDate)
      .filter(e => e.categoryId === selectedCat)
      .filter(e => {
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo = !toDate || e.date <= toDate;
        return matchesFrom && matchesTo;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenseEntries, settings.startDate, selectedCat, fromDate, toDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) return;

    setIsSaving(true);
    try {
      const amount = parseFloat(form.amount) || 0;
      const payload = { categoryId: selectedCat, date: form.date, details: form.details, amount };

      if (editingEntity) {
        await updateExpenseEntry(editingEntity.id, payload);
        toast('Entry updated', 'success');
      } else {
        await addExpenseEntry(payload);
        toast('Entry added', 'success');
      }
      setShowEntryForm(false);
      setEditingEntity(null);
    } catch (err) {
      toast('Failed to save entry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (expenseCategories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
        toast('Category already exists', 'error');
        return;
    }
    addExpenseCategory(newName.trim());
    setNewName('');
    toast('Account created', 'success');
    setActiveTab('analytics');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full bg-slate-50 dark:bg-dark-950 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-dark-800 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all font-black text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <img src="/hr-logo.png" alt="" className="w-4 h-4 object-contain" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Expense</span>
            </div>
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary-600">HR Filling Station</span>
        </div>

        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll pb-32">
        <div className="p-4 space-y-6">
          {/* ── Navigation Tabs ── */}
          <div className="pill-bar flex !p-1.5 h-14 w-full">
            {[
                { id: 'analytics', label: 'Analytics' },
                { id: 'entries', label: 'Entries' },
                { id: 'register', label: 'New Acc' },
                { id: 'manage', label: 'Manage' }
            ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn("flex-1 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === tab.id ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm" : "text-slate-400")}
                >
                  {tab.label}
                </button>
            ))}
          </div>

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* ── Summary High-Card ── */}
              <div className="glass-card !p-8 border-l-8 border-red-500 shadow-2xl bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/10 transition-all">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-2">Total Expenses</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-[20px] font-black text-slate-400">₨</span>
                    <span className="text-4xl font-[900] text-slate-900 dark:text-white tracking-tighter tabular-nums">
                        {formatCurrency(stats.totalExpenses)}
                    </span>
                </div>
              </div>

              {/* ── Summary Grid ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card !p-5 border-l-4 border-slate-300">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categories</p>
                    <p className="text-2xl font-[900] text-slate-800 dark:text-white tabular-nums">{expenseCategories.length}</p>
                </div>
                <div className="glass-card !p-5 border-l-4 border-emerald-500">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Total Entries</p>
                    <p className="text-2xl font-[900] text-slate-800 dark:text-white tabular-nums">{stats.totalEntries}</p>
                </div>
              </div>

              {/* ── Filter Bar ── */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          value={dashboardSearch}
                          onChange={(e) => setDashboardSearch(e.target.value)}
                          placeholder="Search..." 
                          className="w-full h-12 bg-white dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-dark-700/50 pl-11 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                    <div className="relative shrink-0">
                        <select 
                          value={dashSort}
                          onChange={(e) => setDashSort(e.target.value)}
                          className="h-12 pl-10 pr-8 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700/50 rounded-2xl text-[10px] font-black uppercase tracking-wider outline-none appearance-none"
                        >
                            <option value="name_asc">A-Z</option>
                            <option value="name_desc">Z-A</option>
                            <option value="total_desc">Expense (High)</option>
                            <option value="total_asc">Expense (Low)</option>
                        </select>
                        <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 dark:bg-dark-800/50 rounded-2xl border border-slate-200 dark:border-dark-700/50">
                    <button 
                      onClick={() => { setFromDate(today()); setToDate(today()); }}
                      className={cn("flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", fromDate === today() ? "bg-white dark:bg-dark-700 text-slate-900 shadow-sm" : "text-slate-400")}
                    >
                        Today
                    </button>
                    <button 
                      onClick={() => { setFromDate(startOfMonth()); setToDate(today()); }}
                      className={cn("flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", fromDate === startOfMonth() ? "bg-white dark:bg-dark-700 text-slate-900 shadow-sm" : "text-slate-400")}
                    >
                        Month
                    </button>
                </div>
              </div>

              {/* ── Category List ── */}
              <div className="space-y-3">
                {filteredCategories.map((c: any) => (
                    <div 
                      key={c.id} 
                      onClick={() => { setSelectedCat(c.id); setActiveTab('entries'); }}
                      className="glass-card !p-4 border-l-4 border-red-500 flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.count} Entries</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white">₨ {formatCurrency(c.total)}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto mt-0.5 group-active:translate-x-1 transition-transform" />
                        </div>
                    </div>
                ))}

                {filteredCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 bg-slate-200/20 dark:bg-dark-800/10 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-dark-700/50">
                        <Wallet className="w-16 h-16 text-slate-300/50 mb-6" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-6 px-10 leading-relaxed">No Categories Registered</p>
                        <button onClick={() => setActiveTab('register')} className="px-8 py-3.5 bg-red-600/10 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-600/20 transition-all">
                            Register Category →
                        </button>
                    </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'entries' && (
            <div className="space-y-5">
              {/* ── Sub-Selector ── */}
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                 {expenseCategories.map((c: any) => (
                    <button 
                      key={c.id} 
                      onClick={() => setSelectedCat(c.id)}
                      className={cn("px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0 transition-all", selectedCat === c.id ? "bg-red-600 text-white shadow-lg" : "bg-slate-200/50 text-slate-400")}
                    >
                        {c.name}
                    </button>
                 ))}
              </div>

              <div className="glass-card !p-0 !rounded-[2rem] overflow-hidden border-2 border-slate-100 dark:border-dark-800">
                <div className="grid grid-cols-4 bg-slate-100/80 dark:bg-dark-800/80 px-2 py-4">
                    {['DATE', 'DETAILS', 'AMOUNT', 'ACT'].map(h => (
                        <span key={h} className="text-[8px] font-black text-slate-500 text-center uppercase tracking-widest">{h}</span>
                    ))}
                </div>
                <div className="divide-y divide-slate-50 dark:divide-dark-800/50 max-h-[500px] overflow-y-auto no-scrollbar smart-scroll">
                    {filteredEntries.map(e => (
                         <div 
                            key={e.id} 
                            onClick={() => setViewingEntity(e)}
                            className="grid grid-cols-4 items-center px-1 py-5 hover:bg-slate-50 transition-colors cursor-pointer"
                         >
                            <span className="text-[9px] font-bold text-slate-500 text-center">{formatDate(e.date)}</span>
                            <span className="text-[10px] font-black text-slate-900 dark:text-white text-center truncate px-1 uppercase tracking-tighter">{e.details || '-'}</span>
                            <span className="text-[10px] font-black text-red-600 text-center tabular-nums">₨ {formatCurrency(e.amount)}</span>
                            <div className="flex justify-center gap-2">
                                <button onClick={(e_ev) => { e_ev.stopPropagation(); setEditingEntity(e); setForm({ date: e.date, details: e.details || '', amount: e.amount.toString() }); setShowEntryForm(true); }} className="p-2 text-slate-400 hover:text-primary-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={(e_ev) => { e_ev.stopPropagation(); if (confirm('Delete?')) deleteExpenseEntry(e.id); }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                         </div>
                    ))}
                </div>
              </div>
              <button 
                onClick={() => setShowReport(true)}
                className="w-full py-4 bg-slate-200/50 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 active:scale-95 transition-all"
              >
                  <Printer className="w-4 h-4" /> Print Category Report
              </button>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="animate-in zoom-in-95 duration-300 max-w-xl mx-auto pt-4">
              <div className="glass-card !p-8 !rounded-[3rem] border border-red-500/10 shadow-2xl space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
                        <Plus className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-[900] text-slate-900 dark:text-white tracking-tighter uppercase">New Category</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Register a new expense segment</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddCategory} className="space-y-6">
                    <div className="space-y-2">
                        <label className="label ml-2">Category Name</label>
                        <input 
                          className="input !h-16 !rounded-3xl !border-none !bg-slate-100/50 shadow-inner !text-lg !font-black !px-6"
                          placeholder="e.g., Electricity, Staff Food"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          required
                          dir="auto"
                        />
                    </div>
                    <button type="submit" className="w-full py-5 bg-red-600 text-white font-[900] text-sm uppercase tracking-[0.2em] rounded-[2rem] shadow-xl shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Check className="w-5 h-5" /> Confirm Category
                    </button>
                  </form>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Manage Categories</h3>
                    <span className="text-[10px] font-bold text-slate-300">{expenseCategories.length} Total</span>
                </div>
                
                <div className="space-y-3">
                    {expenseCategories.map((c: any) => (
                        <div key={c.id} className="glass-card !p-4 flex items-center justify-between">
                            {editingId === c.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input className="input !h-10 !bg-slate-50 flex-1" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus dir="auto" />
                                    <button onClick={() => { updateExpenseCategory(c.id, editForm.name); setEditingId(null); toast('Category updated', 'success'); }} className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Check className="w-5 h-5" /></button>
                                    <button onClick={() => setEditingId(null)} className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500"><X className="w-5 h-5" /></button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{c.name}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name }); }} className="p-2.5 text-slate-400 hover:text-primary-500 hover:bg-slate-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => { if (confirm('Delete all data for this category?')) deleteExpenseCategory(c.id); }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Entry Modal ── */}
      {showEntryForm && (
        <Modal title={editingEntity ? "Edit Expense" : `Add Expense`} onClose={() => setShowEntryForm(false)} variant="bottom-sheet">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label">Entry Date</label>
                <input type="date" className="input !h-14 !bg-white dark:!bg-dark-800" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div className="space-y-1.5">
                <label className="label">Details / Note</label>
                <input className="input !h-14 !bg-white dark:!bg-dark-800" value={form.details} onChange={e => setForm({...form, details: e.target.value})} placeholder="e.g., Electricity Bill" dir="auto" />
              </div>
              <div className="space-y-1.5">
                <label className="label text-red-600">Amount (PKR) *</label>
                <input type="number" step="any" className="input !h-14 !bg-white !text-red-600 !text-xl !font-black shadow-inner" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" required />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50" disabled={isSaving}>
                {editingEntity ? 'Update Expense' : 'Confirm Expense'}
            </button>
          </form>
        </Modal>
      )}

      {/* Primary Action FAB */}
      {(activeTab === 'analytics' || activeTab === 'entries') && expenseCategories.length > 0 && (
          <FAB 
            icon={Plus} 
            onClick={() => { setEditingEntity(null); setForm({ date: today(), details: '', amount: '' }); setShowEntryForm(true); }} 
            className="!bg-red-600"
          />
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="expense" onClose={() => setViewingEntity(null)} />}
      {showReport && <PrintReportModal data={filteredEntries} type="expense" title={`${cat?.name || 'Expense'} Report`} onClose={() => setShowReport(false)} />}
    </div>
  );
}
