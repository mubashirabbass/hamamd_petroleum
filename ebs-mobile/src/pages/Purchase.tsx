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
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
           <Icon className="w-6 h-6 text-blue-600" />
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
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Purchase</span>
           <div className="flex items-baseline gap-1">
             <span className="text-lg font-black text-blue-600 tabular-nums">₨ {formatCurrency(stats.total)}</span>
           </div>
        </div>
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Price /L</span>
           <div className="flex items-baseline gap-1">
             <span className="text-sm font-black text-slate-600 dark:text-dark-400 tabular-nums">₨ {formatCurrency(stats.avgPrice)}</span>
           </div>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="w-full py-4 rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 shadow-sm flex items-center justify-center gap-2 active:bg-slate-50 transition-all group"
      >
        <Plus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">+ ADD {id} PURCHASE</span>
      </button>
    </div>
  );
}

export default function PurchasePage() {
  const { purchases, addPurchase, updatePurchase, deletePurchase, settings } = useStore();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'analytics' | 'entries'>('analytics');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    description: '',
    invoiceNo: '',
    vehicleNo: '',
    rate: '',
    quantity: '',
    carriage: '',
    amount: '',
    totalAmount: '',
  });

  useEffect(() => {
    const action = searchParams.get('action');
    const type = searchParams.get('type') as FuelType;
    if (action === 'add') {
      if (type) setFuelType(type);
      setShowForm(true);
    }
  }, [searchParams]);

  const handleRateQty = (f: typeof form) => {
    const rate = parseFloat(f.rate) || 0;
    const qty = parseFloat(f.quantity) || 0;
    const carr = parseFloat(f.carriage) || 0;
    const amount = rate * qty;
    const totalAmount = amount + carr;
    return { ...f, amount: amount.toFixed(2), totalAmount: totalAmount.toFixed(2) };
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    setForm(handleRateQty(updated));
  };

  const filtered = useMemo(() => {
    return filterByStartDate(purchases, settings.startDate)
      .filter((p) => p.type === fuelType)
      .filter((p) => {
        const matchesSearch = !search || p.date.includes(search) || (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search.toLowerCase()));
        const matchesFrom = !fromDate || p.date >= fromDate;
        const matchesTo = !toDate || p.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, settings.startDate, fuelType, search, fromDate, toDate]);

  const dashStats = useMemo(() => {
    const t = today();
    const month = t.substring(0, 7);
    const getFuelStats = (type: FuelType) => {
      const f = purchases.filter(p => p.type === type && p.date.startsWith(month));
      const qty = f.reduce((s, x) => s + x.quantity, 0);
      const amt = f.reduce((s, x) => s + x.amount, 0);
      const carriage = f.reduce((s, x) => s + x.carriage, 0);
      const total = amt + carriage;
      return { qty, total, avgPrice: qty > 0 ? total / qty : 0 };
    };
    return { HSD: getFuelStats('HSD'), PMG: getFuelStats('PMG') };
  }, [purchases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.rate || !form.quantity) { toast('Fill required fields', 'error'); return; }
    setIsSaving(true);
    try {
      if (editingEntity) {
        await updatePurchase(editingEntity.id, { ...form, rate: parseFloat(form.rate), quantity: parseFloat(form.quantity), carriage: parseFloat(form.carriage) || 0, amount: parseFloat(form.amount), totalAmount: parseFloat(form.totalAmount), type: fuelType });
        toast('Updated successfully', 'success');
      } else {
        await addPurchase({ ...form, rate: parseFloat(form.rate), quantity: parseFloat(form.quantity), carriage: parseFloat(form.carriage) || 0, amount: parseFloat(form.amount), totalAmount: parseFloat(form.totalAmount), type: fuelType });
        toast('Added successfully', 'success');
      }
      closeForm();
    } catch (err) {
      toast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => { setShowForm(false); setEditingEntity(null); setForm({ date: today(), description: '', invoiceNo: '', vehicleNo: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '' }); };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
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
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Printer className="w-4 h-4" />
              PRINT REPORTS
            </button>

            <div className="pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">RECENT DELIVERIES</h3>
              {purchases.slice(0, 5).map(p => (
                <MobileActivityCard key={p.id} title={p.description || `Invoice #${p.invoiceNo}`} subtitle={`${p.quantity} L @ Rs ${p.rate}`} amount={`₨ ${formatCurrency(p.totalAmount)}`} date={formatDate(p.date)} icon={p.type === 'HSD' ? Fuel : Zap} iconColor={p.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'} onClick={() => setViewingEntity(p)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="p-4 bg-white dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 space-y-3">
              <div className="flex gap-2">
                {(['HSD', 'PMG'] as FuelType[]).map(t => (
                  <button key={t} onClick={() => setFuelType(t)} className={cn("flex-1 py-2.5 rounded-xl border font-black text-[10px] transition-all", fuelType === t ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white dark:bg-dark-800 text-slate-500 border-slate-200 dark:border-dark-700")}>{t}</button>
                ))}
              </div>
              <SearchBar value={search} onChange={setSearch} placeholder="SEARCH INVOICES..." fullWidth />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-dark-800">
              {filtered.map(p => (
                <MobileActivityCard key={p.id} title={p.description || `Invoice #${p.invoiceNo}`} subtitle={`${p.quantity} L @ Rs ${p.rate}`} amount={`₨ ${formatCurrency(p.totalAmount)}`} date={formatDate(p.date)} icon={p.type === 'HSD' ? Fuel : Zap} iconColor={p.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'} onClick={() => setViewingEntity(p)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingEntity ? `EDIT ${fuelType}` : `ADD ${fuelType} PURCHASE`} onClose={closeForm} variant="bottom-sheet">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label><input type="date" className="input w-full !h-12" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inv No</label><input className="input w-full !h-12" value={form.invoiceNo} onChange={e => set('invoiceNo', e.target.value)} placeholder="#" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vehicle / Notes</label><input className="input w-full !h-12" value={form.vehicleNo} onChange={e => set('vehicleNo', e.target.value)} placeholder="VEHICLE NO / DESCRIPTION..." dir="auto" /></div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Price/L</label><input type="number" step="any" className="input w-full !h-12 !text-xl" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.00" required /></div>
                <div className="flex-1 space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Liters</label><input type="number" step="any" className="input w-full !h-12 !text-xl" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" required /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Carriage</label><input type="number" step="any" className="input w-full !h-12" value={form.carriage} onChange={e => set('carriage', e.target.value)} placeholder="0" /></div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total Payable</p>
                <p className="text-3xl font-black text-blue-600 tabular-nums">₨ {formatCurrency(Number(form.totalAmount))}</p>
              </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-blue-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
              {isSaving ? 'SAVING...' : (editingEntity ? 'UPDATE PURCHASE' : 'CONFIRM PURCHASE')}
            </button>
          </form>
        </Modal>
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="purchase" onClose={() => setViewingEntity(null)} onEdit={handleEdit} onDelete={() => deletePurchase(viewingEntity.id)} />}
      {showReport && <PrintReportModal data={filtered} type="purchase" onClose={() => setShowReport(false)} />}
    </div>
  );

  function handleEdit(p: any) { setEditingEntity(p); setForm({ date: p.date, description: p.description || '', invoiceNo: p.invoiceNo || '', vehicleNo: p.vehicleNo || '', rate: p.rate.toString(), quantity: p.quantity.toString(), carriage: p.carriage.toString(), amount: p.amount.toString(), totalAmount: p.totalAmount.toString() }); setShowForm(true); setViewingEntity(null); }
}
