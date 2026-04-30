import { useMemo } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Scale, PieChart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, filterByStartDate, cn } from '../lib/utils';
import ModuleHeader from '../components/ui/ModuleHeader';

export default function BalanceSheetPage() {
  const { 
    assetCategories, assetEntries, 
    liabilityCategories, liabilityEntries, 
    capitalCategories, capitalEntries, 
    settings 
  } = useStore();

  const data = useMemo(() => {
    const filter = (entries: any[]) => filterByStartDate(entries, settings.startDate);

    // Assets
    const assets = assetCategories.map(cat => {
      const ents = filter(assetEntries).filter(e => e.categoryId === cat.id);
      const debit = ents.reduce((s, e) => s + (e.debit || 0), 0);
      const credit = ents.reduce((s, e) => s + (e.credit || 0), 0);
      return { name: cat.name, balance: debit - credit };
    }).filter(a => a.balance !== 0);
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);

    // Liabilities
    const liabilities = liabilityCategories.map(cat => {
      const ents = filter(liabilityEntries).filter(e => e.categoryId === cat.id);
      const debit = ents.reduce((s, e) => s + (e.debit || 0), 0);
      const credit = ents.reduce((s, e) => s + (e.credit || 0), 0);
      return { name: cat.name, balance: credit - debit }; // Credit balance for liabilities
    }).filter(l => l.balance !== 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);

    // Capital
    const capital = capitalCategories.map(cat => {
      const ents = filter(capitalEntries).filter(e => e.categoryId === cat.id);
      const debit = ents.reduce((s, e) => s + (e.debit || 0), 0);
      const credit = ents.reduce((s, e) => s + (e.credit || 0), 0);
      return { name: cat.name, balance: credit - debit }; // Credit balance for capital
    }).filter(c => c.balance !== 0);
    const totalCapital = capital.reduce((s, c) => s + c.balance, 0);

    const totalLiabCapital = totalLiabilities + totalCapital;
    const difference = totalAssets - totalLiabCapital;

    return { assets, totalAssets, liabilities, totalLiabilities, capital, totalCapital, totalLiabCapital, difference };
  }, [assetCategories, assetEntries, liabilityCategories, liabilityEntries, capitalCategories, capitalEntries, settings.startDate]);

  const Item = ({ name, value, isDebit = true }: { name: string; value: number; isDebit?: boolean }) => (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-dark-800/50 last:border-0">
      <span className="text-[12px] text-slate-600 dark:text-dark-400 font-medium">{name}</span>
      <span className={cn("text-[12px] font-bold tabular-nums", value >= 0 ? "text-slate-900 dark:text-white" : "text-red-500")}>
        ₨ {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader 
        title="Balance Sheet" 
        icon={Scale} 
        iconClassName="!bg-emerald-100 !text-emerald-600"
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 no-scrollbar">
        {/* KPI Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-3xl border-l-4 border-emerald-500 shadow-sm">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Assets</p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(data.totalAssets)}</p>
          </div>
          <div className="glass p-4 rounded-3xl border-l-4 border-primary-500 shadow-sm">
            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Liabilities + Capital</p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(data.totalLiabCapital)}</p>
          </div>
          
          {Math.abs(data.difference) > 1 && (
            <div className="col-span-2 glass p-3 rounded-2xl border-l-4 border-red-500 flex items-center justify-between bg-red-50/50">
              <div>
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Out of Balance</p>
                <p className="text-sm font-bold text-red-700">₨ {formatCurrency(data.difference)}</p>
              </div>
              <PieChart className="w-5 h-5 text-red-300" />
            </div>
          )}
        </div>

        {/* Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Assets (Debit)</h3>
          </div>
          <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-xl">
            {data.assets.length > 0 ? (
              data.assets.map(a => <Item key={a.name} name={a.name} value={a.balance} />)
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-4">No assets found</p>
            )}
            <div className="flex justify-between mt-4 pt-4 border-t-2 border-emerald-500/20">
              <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Total Assets</span>
              <span className="text-[13px] font-black text-emerald-600">₨ {formatCurrency(data.totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-primary-600" />
            </div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Liabilities (Credit)</h3>
          </div>
          <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-xl">
            {data.liabilities.length > 0 ? (
              data.liabilities.map(l => <Item key={l.name} name={l.name} value={l.balance} isDebit={false} />)
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-4">No liabilities found</p>
            )}
            <div className="flex justify-between mt-4 pt-4 border-t-2 border-primary-500/20">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-tight">Total Liabilities</span>
              <span className="text-[12px] font-bold text-slate-900 dark:text-white">₨ {formatCurrency(data.totalLiabilities)}</span>
            </div>
          </div>
        </div>

        {/* Capital Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Capital / Equity (Credit)</h3>
          </div>
          <div className="glass p-5 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-xl">
            {data.capital.length > 0 ? (
              data.capital.map(c => <Item key={c.name} name={c.name} value={c.balance} isDebit={false} />)
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-4">No capital accounts found</p>
            )}
            <div className="flex justify-between mt-4 pt-4 border-t-2 border-indigo-500/20">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-tight">Total Capital</span>
              <span className="text-[12px] font-bold text-slate-900 dark:text-white">₨ {formatCurrency(data.totalCapital)}</span>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="bg-primary-600 p-6 rounded-3xl shadow-2xl shadow-primary-600/30">
          <div className="flex justify-between items-center text-white/80 text-[10px] uppercase font-black tracking-widest mb-2">
            <span>Total Liabilities & Capital</span>
            <Scale className="w-4 h-4" />
          </div>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-black text-white tabular-nums leading-none">
              ₨ {formatCurrency(data.totalLiabCapital)}
            </p>
            <div className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-bold text-white">
              BALANCED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
