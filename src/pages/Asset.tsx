import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Package, Trash2, Eye, Edit2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import ManageCategoriesModal from '../components/modals/ManageCategoriesModal';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';

const PER_PAGE = 10;

export default function AssetPage() {
  const { 
    assetCategories, assetEntries, 
    addAssetCategory, updateAssetCategory, deleteAssetCategory, 
    addAssetEntry, deleteAssetEntry, settings, currentUser 
  } = useStore();
  const { toast } = useToast();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });

  useEffect(() => {
    if (!selectedCat && assetCategories.length > 0) {
      setSelectedCat(assetCategories[0].id);
    }
  }, [assetCategories, selectedCat]);

  const cat = assetCategories.find((c) => c.id === selectedCat);

  const catEntries = useMemo(() => {
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
    const sorted = [...catEntries].reverse();
    let bal = 0;
    return sorted.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; }).reverse();
  }, [catEntries]);

  const paged = paginate(withBalance, page, PER_PAGE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date) { toast('Fill required fields', 'error'); return; }
    
    const debit = parseFloat(form.debit) || 0;
    const credit = parseFloat(form.credit) || 0;
    const payload = { categoryId: selectedCat, date: form.date, description: form.description, debit, credit, balance: 0 };
    
    if (editingEntity) {
      useStore.getState().updateAssetEntry(editingEntity.id, payload);
      toast('Asset entry updated', 'success');
    } else {
      addAssetEntry(payload);
      toast('Asset entry added', 'success');
    }
    closeForm();
  };

  const closeForm = () => {
    setShowEntryForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', debit: '', credit: '' });
  };

  const handleEdit = (e: any) => {
    setEditingEntity(e);
    setForm({
      date: e.date,
      description: e.description || '',
      debit: e.debit ? e.debit.toString() : '',
      credit: e.credit ? e.credit.toString() : '',
    });
    setShowEntryForm(true);
  };

  const totals = useMemo(() => ({
    debit: catEntries.reduce((s, e) => s + e.debit, 0),
    credit: catEntries.reduce((s, e) => s + e.credit, 0),
  }), [catEntries]);

  return (
    <div className="animate-fade-in flex gap-4 h-full">
      {/* Category Sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col h-[calc(100vh-140px)] gap-3 font-bold">
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-dark-700/50 bg-emerald-500/5 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
              Assets
            </h2>
            <button 
              onClick={() => setShowManageModal(true)}
              className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
            >
              Manage
            </button>
          </div>
          
          <div className="smart-scroll flex-1 p-2 space-y-1">
            {assetCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">No assets registered</div>
            ) : (
              assetCategories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all duration-200 border border-transparent',
                    selectedCat === c.id 
                      ? 'bg-emerald-600/10 text-emerald-600 border-emerald-600/10 shadow-sm shadow-emerald-600/5 relative overflow-hidden' 
                      : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-200 dark:hover:border-dark-700/50'
                  )}
                >
                   {selectedCat === c.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full"></span>}
                   <div className="flex items-center gap-2 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedCat === c.id ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300 dark:bg-dark-600'}`}></span>
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
          <Modal title={editingEntity ? `Edit Asset Entry — ${cat?.name}` : `Add Asset Entry — ${cat?.name}`} onClose={closeForm}>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction details" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Debit (₨)</label><input type="number" step="0.01" className="input" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} /></div>
                <div><label className="label">Credit (₨)</label><input type="number" step="0.01" className="input" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {editingEntity ? 'Update Asset' : 'Add Asset'} </button>
              </div>
            </form>
          </Modal>
        )}

        {viewingEntity && (
          <TransactionReceiptModal
            entity={viewingEntity}
            type="asset"
            onClose={() => setViewingEntity(null)}
          />
        )}

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 flex items-center justify-center">
              <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {cat?.name || 'Assets Register'}
              </h1>
              {cat && <span className="text-sm font-black text-emerald-600 dark:text-emerald-500 tracking-widest uppercase block mt-1 drop-shadow-sm">ASSET ACCOUNT</span>}
            </div>
          </div>
          {selectedCat && (
            <button onClick={() => { closeForm(); setShowEntryForm(true); }} className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          )}
        </div>

        {selectedCat ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="glass p-5 rounded-2xl border-l-4 border-primary-500 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Debit (Purchased)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">₨ {formatCurrency(totals.debit)}</p>
              </div>
              <div className="glass p-5 rounded-2xl border-l-4 border-slate-400 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Credit (Sold/Used)</p>
                <p className="text-2xl font-black text-slate-500 tabular-nums">₨ {formatCurrency(totals.credit)}</p>
              </div>
              <div className="glass p-5 rounded-2xl border-l-4 border-primary-600 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Current Book Value</p>
                <p className="text-2xl font-black text-primary-600 tabular-nums">₨ {formatCurrency(totals.debit - totals.credit)}</p>
              </div>
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
                <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search asset entries..." /></div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                    <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                    <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="table-header">
                    <th className="table-cell text-left">Date</th>
                    <th className="table-cell text-left">Description</th>
                    <th className="table-cell text-right">Debit (+)</th>
                    <th className="table-cell text-right">Credit (-)</th>
                    <th className="table-cell text-right">Balance</th>
                    <th className="table-cell"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No entries for this asset category</td></tr>
                    ) : paged.map((e) => (
                      <tr key={e.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50">
                        <td className="table-cell whitespace-nowrap text-xs text-slate-500">{formatDate(e.date)}</td>
                        <td className="table-cell text-slate-600 dark:text-dark-300 min-w-[200px] font-medium">{e.description || '—'}</td>
                        <td className="table-cell text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs italic">{e.debit ? `₨ ${formatCurrency(e.debit)}` : '—'}</td>
                        <td className="table-cell text-right text-red-600 dark:text-red-400 font-mono text-xs italic">{e.credit ? `₨ ${formatCurrency(e.credit)}` : '—'}</td>
                        <td className="table-cell text-right font-black text-slate-900 dark:text-white text-sm">₨ {formatCurrency(e.balance)}</td>
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
                                <button onClick={() => { if(confirm('Delete this entry?')) { deleteAssetEntry(e.id); toast('Entry deleted', 'warning'); } }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Entry">
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
              <Pagination page={page} total={withBalance.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 dark:text-dark-500 animate-fade-in opacity-40">
            <Package className="w-16 h-16 mb-4" />
            <p className="font-medium">Select an asset from the left</p>
          </div>
        )}
      </div>

      <ManageCategoriesModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Manage Assets"
        categories={assetCategories}
        onAdd={addAssetCategory}
        onUpdate={updateAssetCategory}
        onDelete={(id) => { deleteAssetCategory(id); if (selectedCat === id) setSelectedCat(null); }}
      />
    </div>
  );
}
