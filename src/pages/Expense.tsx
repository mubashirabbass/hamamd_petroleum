import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';

const PER_PAGE = 10;

export default function ExpensePage() {
  const { 
    expenseCategories, expenseEntries, 
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
    addExpenseEntry, deleteExpenseEntry, settings, currentUser, updateExpenseEntry 
  } = useStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'database' | 'register' | 'manage'>('database');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  
  // Registration Form State
  const [newName, setNewName] = useState('');

  // Management State
  const [manageSearch, setManageSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '' });

  // Transaction Table State
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [form, setForm] = useState({ date: today(), description: '', amount: '' });
  
  useEffect(() => {
    if (!selectedCat && expenseCategories.length > 0) {
      setSelectedCat(expenseCategories[0].id);
    }
  }, [expenseCategories, selectedCat]);

  const cat = expenseCategories.find((c) => c.id === selectedCat);

  const filteredSidebar = useMemo(() =>
    expenseCategories.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [expenseCategories, search]
  );

  const filteredManage = useMemo(() =>
    expenseCategories.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())),
    [expenseCategories, manageSearch]
  );

  const catEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(expenseEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.details?.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [expenseEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const paged = paginate(catEntries, page, PER_PAGE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) { toast('Fill required fields', 'error'); return; }
    
    const amount = parseFloat(form.amount) || 0;
    const payload = { categoryId: selectedCat, date: form.date, details: form.description, amount };
    
    if (editingEntity) {
      updateExpenseEntry(editingEntity.id, payload);
      toast('Entry updated', 'success');
    } else {
      addExpenseEntry(payload);
      toast('Entry added', 'success');
    }
    closeForm();
  };

  const closeForm = () => {
    setShowEntryForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', amount: '' });
  };

  const handleEdit = (e: any) => {
    setEditingEntity(e);
    setForm({
      date: e.date,
      description: e.details || '',
      amount: e.amount ? e.amount.toString() : '',
    });
    setShowEntryForm(true);
  };

  const totals = useMemo(() => ({
    amount: catEntries.reduce((s, e) => s + e.amount, 0),
  }), [catEntries]);



  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addExpenseCategory(newName.trim());
    setNewName('');
    toast('Category registered successfully', 'success');
    setActiveTab('database');
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;
    updateExpenseCategory(id, editForm.name.trim());
    setEditingId(null);
    toast('Category details updated', 'success');
  };

  return (
    <div className="animate-fade-in space-y-6 flex flex-col h-full min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-2xl border border-slate-200 dark:border-dark-700/50 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('database')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'database' 
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <DollarSign className="w-4 h-4" /> Business Expenses
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'register' 
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <UserPlus className="w-4 h-4" /> Register Category
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'manage' 
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Settings className="w-4 h-4" /> Manage Categories
          </button>
        </div>
        {activeTab === 'database' && cat && (
          <div className="flex gap-2">
            <button onClick={() => { closeForm(); setShowEntryForm(true); }} className="btn-primary !bg-red-600 hover:opacity-90 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)] overflow-hidden">
        {activeTab === 'database' ? (
          <>
            <div className="w-64 flex-shrink-0 flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
               <div className="p-3 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Categories</p>
                <span className="text-[10px] font-bold text-slate-300">{filteredSidebar.length}</span>
              </div>
              <div className="p-2 border-b border-slate-100 dark:border-dark-700/30">
                <SearchBar value={search} onChange={setSearch} placeholder="Search Category..." fullWidth={true} className="!py-1.5 !text-[11px]" />
              </div>
              <div className="smart-scroll flex-1 p-2 space-y-1">
                {filteredSidebar.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">No Categories found</div>
                ) : (
                  filteredSidebar.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                      className={cn(
                        'group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer text-xs font-black transition-all duration-200 border border-transparent',
                        selectedCat === c.id 
                          ? 'bg-red-600/10 text-red-600 border-red-600/10 shadow-sm relative overflow-hidden' 
                          : 'text-slate-600 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-200 dark:hover:border-dark-700/50'
                      )}
                    >
                      {selectedCat === c.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-600 rounded-r-full"></span>}
                      <div className="flex flex-col min-w-0">
                        <p className="truncate text-slate-900 dark:text-white">{c.name}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 smart-scroll h-full pr-1">
              {cat ? (
                <>
                  <div className="flex items-center justify-between mb-5 animate-in slide-in-from-bottom duration-350">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-red-600/10 dark:bg-red-600/20 flex items-center justify-center">
                        <DollarSign className="w-8 h-8 text-red-600 dark:text-red-600" />
                      </div>
                      <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                          Business Expenses
                        </h1>
                        <span className="text-xl md:text-2xl font-black text-red-600 tracking-widest uppercase block mt-1 drop-shadow-sm">{cat.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 mb-6 animate-in slide-in-from-bottom duration-350 delay-75">
                    <div className="glass p-5 rounded-2xl border-l-4 border-red-600 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Expense Volume</p>
                      <p className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums">₨ {formatCurrency(totals.amount)}</p>
                    </div>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 animate-in slide-in-from-bottom duration-350 delay-150">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
                      <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." /></div>
                      <div className="flex items-center gap-2">
                        <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                        <span className="text-slate-400">→</span>
                        <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="table-header">
                          <th className="table-cell text-left">Date</th>
                          <th className="table-cell text-left">Description</th>
                          <th className="table-cell text-right">Amount</th>
                          <th className="table-cell"></th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                          {paged.length === 0 ? (
                            <tr><td colSpan={4} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No transactions found</td></tr>
                          ) : paged.map((e) => (
                            <tr key={e.id} className="table-row group">
                              <td className="table-cell whitespace-nowrap text-[10px] font-black text-slate-500 uppercase tracking-tighter">{formatDate(e.date)}</td>
                              <td className="table-cell text-slate-900 dark:text-dark-100 font-black">{e.details || '—'}</td>
                              <td className="table-cell text-right text-red-600 dark:text-red-400 font-mono text-sm font-black">₨ {formatCurrency(e.amount)}</td>
                              <td className="table-cell text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setViewingEntity(e)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="View Details">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {currentUser?.role === 'Admin' && (
                                    <>
                                      <button onClick={() => handleEdit(e)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit Entry">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => { if(confirm('Delete entry?')) { deleteExpenseEntry(e.id); toast('Entry deleted', 'warning'); } }} className="text-slate-300 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
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
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 opacity-40">
                  <DollarSign className="w-16 h-16 mb-4" />
                  <p className="font-medium font-bold">Select a category to view statement</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'register' ? (
          <div className="flex-1 animate-in zoom-in-95 duration-300">
            <div className="max-w-2xl mx-auto glass p-8 rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-2xl mt-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-red-600/10 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Category Registration</h2>
                  <p className="text-sm text-slate-500 font-medium">Create a new entry in your Expense database</p>
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="label text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 block">Category Name *</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        className="input !pl-12 !py-4 !text-lg !font-bold" 
                        placeholder="e.g. Utility Bills, Travel, etc." 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        required 
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                   <p className="text-xs text-slate-400 font-medium italic">All required fields marked with *</p>
                   <button type="submit" className="btn-primary !px-12 !py-4 font-black shadow-xl shadow-red-600/20 text-base flex items-center gap-2 !bg-red-600 hover:opacity-90">
                     <Check className="w-5 h-5" /> Complete Registration
                   </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 animate-in slide-in-from-right duration-300 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-dark-900/50 p-6 rounded-2xl border border-slate-200 dark:border-dark-700/50 shadow-sm mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    className="input !pl-10 !py-3 !text-lg !font-bold" 
                    placeholder="Quick search..." 
                    value={manageSearch} 
                    onChange={e => setManageSearch(e.target.value)} 
                  />
                </div>
                <div className="px-6 py-3 bg-slate-100 dark:bg-dark-800 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-dark-700/50">
                  {expenseCategories.length} Categories Found
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex-1 flex flex-col">
               <div className="overflow-y-auto smart-scroll">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50/90 dark:bg-dark-800/90 backdrop-blur-sm z-10"><tr className="border-b border-slate-200 dark:border-dark-700/50">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Category Name</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                      {filteredManage.length === 0 ? (
                        <tr><td colSpan={2} className="px-6 py-20 text-center text-slate-400 italic font-medium">No results found</td></tr>
                      ) : filteredManage.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/20 transition-all group">
                           {editingId === c.id ? (
                             <>
                               <td className="px-6 py-3">
                                  <input className="input !py-1.5 !text-sm w-full" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus />
                               </td>
                               <td className="px-6 py-3 text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                     <button onClick={() => handleSaveEdit(c.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl"><Check className="w-5 h-5" /></button>
                                     <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-xl"><X className="w-5 h-5" /></button>
                                  </div>
                               </td>
                             </>
                           ) : (
                             <>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                     <span className="font-bold text-slate-800 dark:text-white text-lg">{c.name}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => handleStartEdit(c)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                     {currentUser?.role === 'Admin' && (
                                       <button onClick={() => { if(confirm('Delete account and all history?')) deleteExpenseCategory(c.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                                     )}
                                  </div>
                               </td>
                             </>
                           )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {showEntryForm && (
        <Modal title={editingEntity ? `Edit Entry — ${cat?.name}` : `Add Entry — ${cat?.name}`} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div><label className="label">Amount (₨) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><label className="label">Details</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction details" rows={3}></textarea></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary !bg-red-600"><Plus className="w-4 h-4" />{editingEntity ? 'Update' : 'Add'} Entry</button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && (
        <TransactionReceiptModal
          entity={viewingEntity}
          type="expense"
          onClose={() => setViewingEntity(null)}
        />
      )}
    </div>
  );
}
