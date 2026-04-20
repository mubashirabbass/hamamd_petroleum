import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, DollarSign,
  Package, BarChart3, Users, ChevronRight,
  Fuel, Zap, Calendar, XCircle, Keyboard, Sun, Moon,
  Mail, Shield, Clock, X, LogOut, Landmark, Settings as SettingsIcon
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency, today, cn } from '../lib/utils';

// ─── Digital Clock & Persona Overlay ──────────────────────────────────────────
function DigitalClockOverlay() {
  const [now, setNow] = useState(new Date());
  const { theme, toggle: toggleTheme } = useTheme();
  const { currentUser } = useStore();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const displayHH = String(hh % 12 || 12).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const dateStr = now.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  const initials = currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'MA';

  return (
    <div className="absolute inset-x-4 bottom-6 flex items-center justify-between">
      {/* Time & Date Glass Card */}
      <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-[2rem] px-5 py-3 flex items-center gap-4 shadow-xl ring-1 ring-white/10">
        <div className="flex flex-col">
          <div className="flex items-baseline leading-none gap-1">
            <span className="text-2xl font-[900] tracking-tight text-slate-900">{displayHH}:{mm}</span>
            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{ampm}</span>
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{dateStr}</p>
        </div>
        
        <div className="w-px h-8 bg-white/20 mx-1" />

        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/40 border border-white/40 shadow-sm active:scale-95"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-primary-600" />}
        </button>
      </div>

      {/* User Profile Avatar */}
      <div className="w-12 h-12 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-black text-sm shadow-xl border-2 border-white ring-4 ring-black/5">
        {initials}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const {
    expenseEntries: rawExpenses, settings,
    purchases: rawPurchases, sales: rawSales,
    assetAccounts, liabilityAccounts, customers
  } = useStore();

  const [filter, setFilter]     = useState<'today' | 'month' | 'overall'>('overall');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  // ─── Data Memo ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const t = today();
    const currentMonth = t.substring(0, 7);

    const filterFn = (item: { date: string }) => {
      if (filter === 'today')  return item.date === t;
      if (filter === 'month')  return item.date.startsWith(currentMonth);
      return true;
    };

    const periodSales = rawSales.filter(filterFn);
    const periodExpenses = rawExpenses.filter(filterFn);

    const hsdSoldAmt = periodSales.filter((s: any) => s.type === 'HSD').reduce((sum: number, x: any) => sum + (x.amount || 0), 0);
    const pmgSoldAmt = periodSales.filter((s: any) => s.type === 'PMG').reduce((sum: number, x: any) => sum + (x.amount || 0), 0);
    const totalSalesAmt = hsdSoldAmt + pmgSoldAmt;
    const totalExpAmt   = periodExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const getStock = (type: string) => {
      const p = rawPurchases.filter(x => x.type === type).reduce((sum, x) => sum + (x.quantity || 0), 0);
      const s = rawSales.filter(x => x.type === type).reduce((sum, x) => sum + (x.quantity || 0), 0);
      return p - s;
    };

    const getPeriodQty = (source: any[], type: string) => source.filter(filterFn).filter(x => x.type === type).reduce((sum, x) => sum + (x.quantity || 0), 0);

    return {
      totalSales: totalSalesAmt,
      totalExpenses: totalExpAmt,
      hsd: {
        stock: getStock('HSD'),
        sold: getPeriodQty(rawSales, 'HSD'),
        purchased: getPeriodQty(rawPurchases, 'HSD')
      },
      pmg: {
        stock: getStock('PMG'),
        sold: getPeriodQty(rawSales, 'PMG'),
        purchased: getPeriodQty(rawPurchases, 'PMG')
      },
      counts: {
        purchase: rawPurchases.length,
        sale: rawSales.length,
        expense: rawExpenses.length,
        asset: assetAccounts.length,
        liability: liabilityAccounts.length,
        customer: customers.length,
      }
    };
  }, [rawPurchases, rawSales, rawExpenses, assetAccounts, liabilityAccounts, customers, filter]);

  const quickLinks = [
    { label: 'PURCHASE', count: `${stats.counts.purchase} records`,    icon: ShoppingCart, color: 'lavender', path: '/purchase' },
    { label: 'SALE',     count: `${stats.counts.sale} records`,        icon: TrendingUp,   color: 'mint',     path: '/sale' },
    { label: 'EXPENSE',  count: `${stats.counts.expense} categories`,  icon: DollarSign,   color: 'pink',     path: '/expense' },
    { label: 'ASSET',    count: `${stats.counts.asset} accounts`,      icon: Landmark,     color: 'peach',    path: '/asset' },
    { label: 'LIABILITY',count: `${stats.counts.liability} accounts`,  icon: Landmark,     color: 'orange',   path: '/liability' },
    { label: 'STOCK',    count: `Real-time tracking`,                  icon: BarChart3,    color: 'blue',     path: '/stock' },
    { label: 'CUSTOMER', count: `${stats.counts.customer} registered`, icon: Users,        color: 'rose',     path: '/customer' },
    { label: 'SETTINGS', count: `System Configuration`,                icon: SettingsIcon, color: 'sky',      path: '/settings' },
  ];

  return (
    <div className="animate-fade-in space-y-6 pb-32 px-4 h-full w-full overflow-y-auto no-scrollbar pt-4">
      
      {/* ── Dashboard Banner ── */}
      <div className="relative w-full h-64 rounded-[2.5rem] overflow-hidden shadow-2xl mb-8">
        <img 
          src="https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop" 
          alt="HR Station" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        
        {/* Urdu Center Heading */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full text-center" dir="rtl">
           <p className="text-white font-urdu text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-bold">
             حماد رحیم فلنگ اسٹیشن میجمنٹ سسٹم
           </p>
        </div>

        <DigitalClockOverlay />
      </div>

      {/* ── Integrated Filter Pill ── */}
      <div className="pill-bar flex items-center justify-between gap-1 overflow-hidden">
        <div className="flex bg-slate-100 dark:bg-dark-700 p-1 rounded-[2.5rem] flex-shrink-0">
          {['TODAY', 'MONTH', 'OVERALL'].map(opt => (
            <button 
              key={opt} 
              onClick={() => setFilter(opt.toLowerCase() as any)}
              className={cn(
                'px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all duration-300',
                filter === opt.toLowerCase() ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1 border-l border-slate-100 dark:border-dark-700 flex-1 justify-end">
           <div className="flex flex-col items-start gap-0.5">
             <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">FROM</span>
             <div className="relative group flex items-center">
                <input type="date" className="bg-transparent border-none text-[10px] font-black uppercase px-0 outline-none w-20 appearance-none" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
             </div>
           </div>
           <div className="w-px h-6 bg-slate-100 dark:bg-dark-700 mx-1" />
           <div className="flex flex-col items-start gap-0.5">
             <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">TO</span>
             <div className="relative group flex items-center">
                <input type="date" className="bg-transparent border-none text-[10px] font-black uppercase px-0 outline-none w-20 appearance-none" value={toDate} onChange={e => setToDate(e.target.value)} />
                <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
             </div>
           </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card !bg-white !p-5 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-[#E6FAF2] flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
            <p className="text-xl font-[900] text-[#10B981] tracking-tight tabular-nums leading-none">
              <span className="text-sm mr-1">Rs</span>{stats.totalSales.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="glass-card !bg-white !p-5 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FFF1F5] flex items-center justify-center">
            <XCircle className="w-6 h-6 text-[#F43F5E]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expenses</p>
            <p className="text-xl font-[900] text-[#F43F5E] tracking-tight tabular-nums leading-none">
              <span className="text-sm mr-1">Rs</span>{stats.totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Product Status Cards ── */}
      <div className="space-y-4">
        {[
          { type: 'HSD', label: 'HIGH SPEED DIESEL', data: stats.hsd, icon: Fuel, color: '#F59E0B' },
          { type: 'PMG', label: 'PETROL / PMG', data: stats.pmg, icon: Zap, color: '#10B981' }
        ].map(p => (
          <div key={p.type} className="glass-card !bg-white !rounded-[2.5rem] !p-8 relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-50" style={{ backgroundColor: `${p.color}15` }}>
                 <p.icon className="w-8 h-8" style={{ color: p.color }} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-[900] leading-none" style={{ color: p.color }}>{p.type}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{p.label}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-50">
              {[
                { label: 'PURCHASE', val: p.data.purchased },
                { label: 'SALE', val: p.data.sold },
                { label: 'STOCK', val: p.data.stock, color: p.data.stock < 0 ? '#F43F5E' : p.color }
              ].map(col => (
                <div key={col.label} className="flex flex-col gap-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{col.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-[900] tracking-tighter leading-none tabular-nums" style={{ color: col.color || '#1e293b' }}>
                      {col.val}
                    </span>
                    <span className="text-[10px] font-black text-slate-400">L</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Activity Grid ── */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        {quickLinks.map((link) => (
          <div 
            key={link.label}
            onClick={() => navigate(link.path)}
            className={cn(
              "p-6 rounded-[2.5rem] flex flex-col items-start gap-4 active:scale-95 transition-all cursor-pointer relative overflow-hidden",
              `card-${link.color}`
            )}
          >
            <div className="w-full flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center backdrop-blur-sm">
                <link.icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 opacity-30" />
            </div>
            <div className="flex flex-col">
              <p className="text-[14px] font-[900] leading-none mb-1.5">{link.label}</p>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{link.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
