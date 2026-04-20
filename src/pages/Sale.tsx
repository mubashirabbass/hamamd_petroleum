import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Eye, Edit2, Printer, BarChart3, ArrowRight, History, Zap, Fuel, 
  LayoutGrid, Database, TrendingUp, Save, Pin, PinOff, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import FAB from '../components/ui/FAB';
import MobileActivityCard from '../components/ui/MobileActivityCard';
import type { FuelType } from '../store/useStore';

export default function SalePage() {
  const { sales, addSale, settings } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Layout State
  const [activeTab, setActiveTab] = useState<'analytics' | 'entries'>('analytics');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(startOfMonth());
  const [toDate, setToDate] = useState(today());
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({ 
    date: today(), 
    description: '', 
    quantity: '', 
    rate: '', 
    amount: '' 
  });

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    const rate = parseFloat(k === 'rate' ? v : updated.rate) || 0;
    const qty = parseFloat(k === 'quantity' ? v : updated.quantity) || 0;
    setForm({ ...updated, amount: (rate * qty).toFixed(2) });
  };

  const filtered = useMemo(() => {
    return filterByStartDate(sales, settings.startDate)
      .filter((s) => (activeTab === 'entries' ? s.type === fuelType : true))
      .filter((s) => {
        const matchesSearch = !search || s.date.includes(search) || (s.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesFrom = !fromDate || s.date >= fromDate;
        const matchesTo = !toDate || s.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, settings.startDate, fuelType, activeTab, search, fromDate, toDate]);

  const paged = paginate(filtered, page, perPage);

  const dashStats = useMemo(() => {
    const periodSales = filterByStartDate(sales, settings.startDate).filter(s => {
      const matchesFrom = !fromDate || s.date >= fromDate;
      const matchesTo = !toDate || s.date <= toDate;
      return matchesFrom && matchesTo;
    });

    const getStats = (type: FuelType) => {
      const f = periodSales.filter(s => s.type === type);
      const qty = f.reduce((s, x) => s + x.quantity, 0);
      const amt = f.reduce((s, x) => s + x.amount, 0);
      return { qty, amt, avgRate: qty > 0 ? amt / qty : 0 };
    };

    return {
      HSD: getStats('HSD'),
      PMG: getStats('PMG'),
      recent: [...periodSales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    };
  }, [sales, settings.startDate, fromDate, toDate]);

  const openForm = (type?: FuelType, entry?: any) => {
    if (type) setFuelType(type);
    if (entry) {
        setEditingEntity(entry);
        setForm({
            date: entry.date,
            description: entry.description || '',
            quantity: entry.quantity.toString(),
            rate: entry.rate.toString(),
            amount: entry.amount.toString()
        });
    } else {
        setEditingEntity(null);
        setForm({ date: today(), description: '', quantity: '', rate: '', amount: '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.quantity || !form.rate) return;

    setIsSaving(true);
    try {
      const payload = {
        type: fuelType,
        date: form.date,
        description: form.description,
        quantity: parseFloat(form.quantity),
        rate: parseFloat(form.rate),
        amount: parseFloat(form.amount)
      };

      if (editingEntity) {
        await useStore.getState().updateSale(editingEntity.id, payload);
        toast('Sale updated', 'success');
      } else {
        await addSale(payload);
        toast('Sale added', 'success');
      }
      setShowForm(false);
      setEditingEntity(null);
    } catch (err) {
      toast('Failed to save sale', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full bg-slate-50 dark:bg-dark-950 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-dark-800 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-slate-100 dark:hover:bg-dark-800">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <img src="/hr-logo.png" alt="" className="w-4 h-4 object-contain" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Sale</span>
            </div>
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary-600">HR Filling Station</span>
        </div>

        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll pb-32">
        <div className="p-4 space-y-6">
          {/* ── View Toggle ── */}
          <div className="flex items-center gap-3">
            <div className="pill-bar flex-1 !p-1.5 flex h-14">
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={cn("flex-1 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'analytics' ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm" : "text-slate-400")}
                >
                  Analytics
                </button>
                <button 
                  onClick={() => setActiveTab('entries')}
                  className={cn("flex-1 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'entries' ? "bg-white dark:bg-dark-700 text-primary-600 shadow-sm" : "text-slate-400")}
                >
                  Entries
                </button>
            </div>
            <button className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-slate-400 active:scale-90 transition-all">
                <PinOff className="w-5 h-5" />
            </button>
          </div>

          {/* ── Selection Row ── */}
          <div className="flex items-center gap-3">
            <div className="segmented-control !w-auto !rounded-[2rem] h-11 px-1">
                {(['HSD', 'PMG'] as FuelType[]).map(t => (
                    <button 
                      key={t}
                      onClick={() => setFuelType(t)}
                      className={cn("px-6 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all h-9", fuelType === t ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400")}
                    >
                      {t}
                    </button>
                ))}
            </div>
            <div className="flex-1 h-11 bg-slate-200/50 dark:bg-dark-800/50 rounded-[2rem] border border-slate-200/50 dark:border-dark-700/50 flex items-center px-4 gap-2">
                <select className="bg-transparent border-none text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-300 w-full outline-none appearance-none text-center">
                    <option>Current Month</option>
                    <option>Last 30 Days</option>
                    <option>Financial Year</option>
                </select>
                <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
            </div>
          </div>

          {activeTab === 'analytics' ? (
            <>
              {/* ── Stats Cards ── */}
              <div className="grid grid-cols-2 gap-4">
                {[
                    { id: 'HSD', stats: dashStats.HSD, icon: Fuel, color: 'emerald' },
                    { id: 'PMG', stats: dashStats.PMG, icon: Zap, color: 'blue' }
                ].map(item => (
                    <div key={item.id} className="glass-card !p-5 relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-6">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", item.id === 'HSD' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{item.id}</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-3xl font-[900] tracking-tighter tabular-nums", item.id === 'HSD' ? 'text-emerald-600' : 'text-blue-600')}>{item.stats.qty.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-slate-300 uppercase italic">L</span>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">Total: <span className="text-slate-400 font-bold ml-1">₨</span> {formatCurrency(item.stats.amt)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Avg: ₨ {formatCurrency(item.stats.avgRate)}/L</p>
                            </div>

                            <button 
                              onClick={() => openForm(item.id as FuelType)}
                              className="w-full bg-emerald-600 py-3.5 rounded-xl flex items-center justify-center gap-2 text-white active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.1em]">Add</span>
                            </button>
                        </div>
                    </div>
                ))}
              </div>

              {/* ── Global Actions ── */}
              <button 
                onClick={() => setShowReport(true)}
                className="w-full h-16 bg-slate-200/50 dark:bg-dark-800/50 rounded-[2rem] border border-slate-200 dark:border-dark-700/50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all group"
              >
                <Printer className="w-5 h-5 text-slate-500 group-hover:text-primary-600 transition-colors" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Print Reports</span>
              </button>

              {/* ── Recent Activity ── */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Recent Activity</h3>
                    <button onClick={() => setActiveTab('entries')} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">View Entries</button>
                </div>
                
                <div className="space-y-3">
                    {dashStats.recent.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => setViewingEntity(s)}
                          className="glass-card !p-4 !rounded-2xl border border-transparent active:border-primary-500/20 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.type === 'HSD' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500')}>
                                    {s.type === 'HSD' ? <Fuel className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">{s.description || 'Daily Sale'}</p>
                                        <p className="text-sm font-[900] text-slate-900 dark:text-white tabular-nums tracking-tighter">₨ {formatCurrency(s.amount)}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold text-slate-400">{s.quantity.toLocaleString()} L @ ₨ {formatCurrency(s.rate)}</p>
                                        <p className="text-[10px] font-bold text-slate-300">{formatDate(s.date)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {dashStats.recent.length === 0 && (
                        <div className="py-20 text-center uppercase text-[11px] font-black text-slate-300 tracking-[0.2em] animate-pulse">No Recent Sales</div>
                    )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── Entries View ── */}
              <div className="space-y-4">
                <SearchBar value={search} onChange={setSearch} placeholder="Search sales..." fullWidth />
                
                <div className="glass-card !p-0 !rounded-[2rem] overflow-hidden border-2 border-slate-100 dark:border-dark-800">
                    <div className="grid grid-cols-5 bg-slate-100/80 dark:bg-dark-800/80 px-2 py-4">
                        {['DATE', 'NOTE', 'QTY', 'RATE', 'TOTAL'].map(h => (
                            <span key={h} className="text-[8px] font-black text-slate-500 text-center uppercase tracking-widest">{h}</span>
                        ))}
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-dark-800/50 max-h-[500px] overflow-y-auto no-scrollbar smart-scroll">
                        {paged.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => openForm(s.type, s)}
                              className="grid grid-cols-5 items-center px-1 py-5 hover:bg-slate-50 active:bg-slate-100 dark:active:bg-dark-800 transition-colors"
                            >
                                <span className="text-[9px] font-bold text-slate-500 text-center">{formatDate(s.date)}</span>
                                <span className="text-[10px] font-black text-slate-900 dark:text-white text-center truncate px-1 uppercase tracking-tighter">{s.description || '-'}</span>
                                <span className="text-[10px] font-black text-emerald-600 text-center tabular-nums">{s.quantity.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-slate-400 text-center tabular-nums">{formatCurrency(s.rate)}</span>
                                <span className="text-[10px] font-[900] text-slate-900 dark:text-white text-center tabular-nums">{formatCurrency(s.amount)}</span>
                            </div>
                        ))}
                        {paged.length === 0 && (
                            <div className="py-20 text-center uppercase text-[10px] font-black text-slate-300 tracking-widest">No Records Found</div>
                        )}
                    </div>
                </div>
                <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <Modal 
          title={editingEntity ? `Edit ${fuelType} Sale` : `New ${fuelType} Sale`} 
          onClose={() => setShowForm(false)} 
          variant="bottom-sheet"
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-dark-950/20 -m-6 p-6">
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto smart-scroll">
              <div className="space-y-1.5">
                <label className="label">Sale Date</label>
                <input type="date" className="input !h-14 !bg-white dark:!bg-dark-800 !border-none shadow-sm" value={form.date} onChange={(e) => set('date', e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="label">Description / Note</label>
                <input className="input !h-14 !bg-white dark:!bg-dark-800 !border-none shadow-sm" value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="e.g., Daily Account Sale" dir="auto" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="label text-emerald-600">Liters</label>
                  <input type="number" step="any" className="input !h-14 !bg-white dark:!bg-dark-800 !border-none shadow-sm !text-xl" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="label text-blue-600">Rate</label>
                  <input type="number" step="any" className="input !h-14 !bg-white dark:!bg-dark-800 !border-none shadow-sm !text-xl" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" required />
                </div>
              </div>

              <div className="bg-emerald-600/5 dark:bg-emerald-600/10 p-5 rounded-[2rem] border border-emerald-600/20">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 opacity-60">Total Receivable</p>
                 <p className="text-4xl font-[900] text-emerald-600 dark:text-emerald-400 tabular-nums leading-none tracking-tighter">₨ {formatCurrency(Number(form.amount))}</p>
              </div>
            </div>

            <div className="sticky-bottom-actions !bg-transparent !border-none !p-0">
               <button 
                type="submit" 
                className="w-full py-5 bg-emerald-600 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                {editingEntity ? 'Update Record' : 'Add Sale Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="sale" onClose={() => setViewingEntity(null)} />}
      {showReport && <PrintReportModal data={filtered} type="sale" onClose={() => setShowReport(false)} />}
    </div>
  );
}
