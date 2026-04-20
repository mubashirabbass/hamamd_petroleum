import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Fuel, Zap, Plus, Printer } from 'lucide-react';
import { useStore, FuelType } from '../store/useStore';
import { formatCurrency, formatDate, today, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import MobileActivityCard from '../components/ui/MobileActivityCard';

// ─── Analytics Card Component ──────────────────────────────────────────────────
function AnalyticsCard({ 
  id, label, stats, onAdd, icon: Icon 
}: { 
  id: string, label: string, stats: any, onAdd: () => void, icon: any 
}) {
  return (
    <div className="glass-card active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
           <Icon className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-[900] text-slate-800 dark:text-white leading-none">{id}</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6 pt-4 border-t border-slate-100 dark:border-dark-800">
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume (Month)</span>
           <div className="flex items-baseline gap-1">
             <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{stats.qty.toLocaleString()}</span>
             <span className="text-[9px] font-black text-slate-400">L</span>
           </div>
        </div>
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales</span>
           <div className="flex items-baseline gap-1">
             <span className="text-lg font-black text-emerald-600 tabular-nums">₨ {formatCurrency(stats.amt)}</span>
           </div>
        </div>
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Rate /L</span>
           <div className="flex items-baseline gap-1">
             <span className="text-sm font-black text-slate-600 dark:text-dark-400 tabular-nums">₨ {formatCurrency(stats.avgRate)}</span>
           </div>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="w-full py-4 rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 shadow-sm flex items-center justify-center gap-2 active:bg-slate-50 transition-all group"
      >
        <Plus className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">+ ADD {id} SALE</span>
      </button>
    </div>
  );
}

export default function SalePage() {
  const { sales, addSale, updateSale, deleteSale, settings } = useStore();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'analytics' | 'entries'>('analytics');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState({ date: today(), description: '', quantity: '', rate: '', amount: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    const type = searchParams.get('type') as FuelType;
    if (action === 'add') {
      if (type) setFuelType(type);
      setShowForm(true);
    }
  }, [searchParams]);

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    const rate = parseFloat(k === 'rate' ? v : updated.rate) || 0;
    const qty = parseFloat(k === 'quantity' ? v : updated.quantity) || 0;
    setForm({ ...updated, amount: (rate * qty).toFixed(2) });
  };

  const filtered = useMemo(() => {
    return filterByStartDate(sales, settings.startDate)
      .filter((s) => s.type === fuelType)
      .filter((s) => {
        const matchesSearch = !search || s.date.includes(search) || (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
        const matchesFrom = !fromDate || s.date >= fromDate;
        const matchesTo = !toDate || s.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, settings.startDate, fuelType, search, fromDate, toDate]);

  const dashStats = useMemo(() => {
    const t = today();
    const month = t.substring(0, 7);
    const getFuelStats = (type: FuelType) => {
      const f = sales.filter(s => s.type === type && s.date.startsWith(month));
      const qty = f.reduce((s, x) => s + x.quantity, 0);
      const amt = f.reduce((s, x) => s + x.amount, 0);
      return { qty, amt, avgRate: qty > 0 ? amt / qty : 0 };
    };
    return { HSD: getFuelStats('HSD'), PMG: getFuelStats('PMG') };
  }, [sales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.quantity || !form.rate) { toast('Fill required fields', 'error'); return; }
    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateSale(editingEntity.id, { ...form, quantity: parseFloat(form.quantity), rate: parseFloat(form.rate), amount: parseFloat(form.amount), type: fuelType });
        toast('Updated successfully', 'success');
      } else {
        await addSale({ ...form, quantity: parseFloat(form.quantity), rate: parseFloat(form.rate), amount: parseFloat(form.amount), type: fuelType });
        toast('Entry added', 'success');
      }
      closeForm();
    } catch (err) {
      toast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => { setShowForm(false); setEditingEntity(null); setForm({ date: today(), description: '', quantity: '', rate: '', amount: '' }); };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      {/* ── Sub Header — Tab Switcher ── */}
      <div className="px-4 pt-4 pb-2 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800">
        <div className="segmented-control">
          <button onClick={() => setActiveTab('analytics')} className={cn("segmented-item", activeTab === 'analytics' ? "segmented-item-active" : "segmented-item-inactive")}>
            ANALYTICS
          </button>
          <button onClick={() => setActiveTab('entries')} className={cn("segmented-item", activeTab === 'entries' ? "segmented-item-active" : "segmented-item-inactive")}>
            ENTRIES
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab === 'analytics' ? (
          <div className="p-4 space-y-4">
            <AnalyticsCard id="HSD" label="HIGH SPEED DIESEL" stats={dashStats.HSD} icon={Fuel} onAdd={() => { setFuelType('HSD'); setShowForm(true); }} />
            <AnalyticsCard id="PMG" label="PETROL / PMG" stats={dashStats.PMG} icon={Zap} onAdd={() => { setFuelType('PMG'); setShowForm(true); }} />
            
            <button 
              onClick={() => setShowReport(true)}
              className="w-full py-4 rounded-2xl bg-primary-600 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-primary-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Printer className="w-4 h-4" />
              PRINT REPORTS
            </button>

            <div className="pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">RECENT TRANSACTIONS</h3>
              <div className="space-y-0">
                {sales.slice(0, 5).map(s => (
                  <MobileActivityCard key={s.id} title={s.description || 'Fuel Sale'} subtitle={`${s.quantity} L @ Rs ${s.rate}`} amount={`₨ ${formatCurrency(s.amount)}`} date={formatDate(s.date)} icon={s.type === 'HSD' ? Fuel : Zap} iconColor={s.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'} onClick={() => setViewingEntity(s)} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="p-4 bg-white dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 space-y-3">
              <div className="flex gap-2">
                {(['HSD', 'PMG'] as FuelType[]).map(t => (
                  <button key={t} onClick={() => setFuelType(t)} className={cn("flex-1 py-2.5 rounded-xl border font-black text-[10px] transition-all", fuelType === t ? "bg-emerald-600 text-white border-emerald-600 shadow-lg" : "bg-white dark:bg-dark-800 text-slate-500 border-slate-200 dark:border-dark-700")}>{t}</button>
                ))}
              </div>
              <SearchBar value={search} onChange={setSearch} placeholder="SEARCH ENTRIES..." fullWidth />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-dark-800">
              {filtered.map(s => (
                <MobileActivityCard key={s.id} title={s.description || 'Fuel Sale'} subtitle={`${s.quantity} L @ Rs ${s.rate}`} amount={`₨ ${formatCurrency(s.amount)}`} date={formatDate(s.date)} icon={s.type === 'HSD' ? Fuel : Zap} iconColor={s.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'} onClick={() => setViewingEntity(s)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingEntity ? `EDIT ${fuelType}` : `ADD ${fuelType} SALE`} onClose={closeForm} variant="bottom-sheet">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Effective Date</label><input type="date" className="input w-full !h-12" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label><input className="input w-full !h-12" value={form.description} onChange={e => set('description', e.target.value)} placeholder="ENTER NOTE..." dir="auto" /></div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Liters</label><input type="number" step="any" className="input w-full !h-12 !text-xl" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0.00" required /></div>
                <div className="flex-1 space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Rate</label><input type="number" step="any" className="input w-full !h-12 !text-xl" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.00" required /></div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Amount</p>
                <p className="text-3xl font-black text-emerald-600 tabular-nums">₨ {formatCurrency(Number(form.amount))}</p>
              </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
              {isSaving ? 'SAVING...' : (editingEntity ? 'UPDATE SALE' : 'CONFIRM SALE')}
            </button>
          </form>
        </Modal>
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="sale" onClose={() => setViewingEntity(null)} onEdit={handleEdit} onDelete={() => deleteSale(viewingEntity.id)} />}
      {showReport && <PrintReportModal data={filtered} type="sale" onClose={() => setShowReport(false)} />}
    </div>
  );

  function handleEdit(s: any) { setEditingEntity(s); setForm({ date: s.date, description: s.description || '', quantity: s.quantity.toString(), rate: s.rate.toString(), amount: s.amount.toString() }); setShowForm(true); setViewingEntity(null); }
}
