import React, { useMemo, useState } from 'react';
import { FileText, Check, X, PlusCircle, Scale, Download, Printer, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, cn, today, computeFuelStats } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import PrintReportModal from '../components/modals/PrintReportModal';
import * as ExcelJS from 'exceljs';

function SectionBar({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-[#1e2634] text-white select-none">
      <span className="text-[11px] font-semibold tracking-[0.12em] uppercase">{children}</span>
      {subtitle && <span className="text-[10px] text-slate-400 tracking-wide">{subtitle}</span>}
    </div>
  );
}

function TH({ children, right, action }: { children: React.ReactNode; right?: boolean; action?: React.ReactNode }) {
  return (
    <th className={cn(
      'sticky top-0 z-10 bg-[#f4f5f7] dark:bg-[#1a2035] px-4 py-2',
      'text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500',
      'border-b border-slate-200 whitespace-nowrap',
      right ? 'text-right' : 'text-left'
    )}>
      <div className={cn('flex items-center', right ? 'justify-end' : 'justify-between')}>
        {children}
        {action}
      </div>
    </th>
  );
}

function DarkFooterRow({ label, value, colSpan }: { label: string; value: number; colSpan?: number }) {
  return (
    <tr style={{ background: '#1e2634' }}>
      <td
        colSpan={colSpan ?? 1}
        style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffffff' }}
      >
        <span style={{ color: '#ffffff' }}>{label}</span>
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: '#ffffff' }}>&#8360; {formatCurrency(value)}</span>
      </td>
    </tr>
  );
}

const tdBase: React.CSSProperties = { padding: '10px 16px', fontSize: 12, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' };

export default function BalanceSheet() {
  const store = useStore();
  const { toast } = useToast();

  const assetCategories = store.assetCategories || [];
  const assetEntries = store.assetEntries || [];
  const capitalCategories = store.capitalCategories || [];
  const capitalEntries = store.capitalEntries || [];
  const customerEntries = store.customerEntries || [];
  const purchases = store.purchases || [];
  const sales = store.sales || [];

  const [newCapName, setNewCapName] = useState('');
  const [newCapAmount, setNewCapAmount] = useState('');
  const [showCapEntry, setShowCapEntry] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [showAssetEntry, setShowAssetEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);

  const settings = store.settings || {};
  const startDate = settings.startDate || '';
  const endDate = (settings as any).endDate || today();
  const plsOverrides = settings.plsOverrides || {};

  const d = useMemo(() => {
    const allAssets = assetCategories.map(cat => {
      const bal = assetEntries
        .filter(e => e.categoryId === cat.id && (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate))
        .reduce((s: number, e: any) => s + (e.debit || 0) - (e.credit || 0), 0);
      return { id: cat.id, name: cat.name, bal };
    });
    const totalFixedAssets = allAssets.reduce((s: number, a: any) => s + a.bal, 0);

    const filteredCustomers = customerEntries.filter(e => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate));
    const totalReceivables = filteredCustomers.reduce((s: number, e: any) => s + (e.debit || 0), 0);
    const totalPayables = filteredCustomers.reduce((s: number, e: any) => s + (e.credit || 0), 0);

    const pmg = (() => { 
      const s = computeFuelStats('PMG', purchases, sales, plsOverrides, startDate, endDate, {
        pur: settings.purchaseAdjustmentPMG,
        sal: settings.saleAdjustmentPMG,
        stock: settings.stockAdjustmentPMG,
        baseRate: settings.baseRatePMG
      }); 
      return { qty: s.stock.qty, avg: s.stock.avg, val: s.stock.amt }; 
    })();
    const hsd = (() => { 
      const s = computeFuelStats('HSD', purchases, sales, plsOverrides, startDate, endDate, {
        pur: settings.purchaseAdjustmentHSD,
        sal: settings.saleAdjustmentHSD,
        stock: settings.stockAdjustmentHSD,
        baseRate: settings.baseRateHSD
      }); 
      return { qty: s.stock.qty, avg: s.stock.avg, val: s.stock.amt }; 
    })();

    const capital = capitalCategories.map(cat => {
      const bal = capitalEntries
        .filter(e => e.categoryId === cat.id && (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate))
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      return { id: cat.id, name: cat.name, bal };
    });
    const totalCapital = capital.reduce((s: number, c: any) => s + c.bal, 0);

    const totalAssets = totalFixedAssets + totalReceivables + pmg.val + hsd.val;
    const totalEquity = totalPayables + totalCapital;

    return { allAssets, totalFixedAssets, totalReceivables, totalPayables, pmg, hsd, totalCapital, totalAssets, totalEquity, capital };
  }, [assetCategories, assetEntries, capitalCategories, capitalEntries, customerEntries, purchases, sales, startDate, endDate, plsOverrides]);

  const totalAssets = d.totalAssets;
  const totalEquity = d.totalEquity;
  const balanced = Math.abs(totalAssets - totalEquity) < 1;

  const exportToExcel = async () => {
    // Immediate feedback to verify the click works
    console.log('EXCEL BUTTON CLICKED');
    toast('Generating Excel Bill...', 'info');
    
    try {
      // Robust Workbook instantiation for different bundling styles
      let WorkbookClass;
      if ((ExcelJS as any).Workbook) {
        WorkbookClass = (ExcelJS as any).Workbook;
      } else if ((ExcelJS as any).default && (ExcelJS as any).default.Workbook) {
        WorkbookClass = (ExcelJS as any).default.Workbook;
      } else {
        // Fallback for some environments
        const mod = ExcelJS as any;
        WorkbookClass = mod.Workbook || (mod.default ? mod.default.Workbook : null);
      }

      if (!WorkbookClass) {
        throw new Error('ExcelJS library not correctly loaded');
      }

      const workbook = new WorkbookClass();
      const sheet = workbook.addWorksheet('Balance Sheet');
      
      sheet.columns = [
        { header: 'Category', key: 'cat', width: 25 },
        { header: 'Particulars', key: 'part', width: 35 },
        { header: 'Value', key: 'val', width: 20 }
      ];

      sheet.getRow(1).font = { bold: true };

      sheet.addRow(['ASSETS', '', '']);
      d.allAssets.forEach(a => sheet.addRow(['Fixed Assets', a.name, a.bal]));
      sheet.addRow(['Current Assets', 'Stock — PMG', d.pmg.val]);
      sheet.addRow(['Current Assets', 'Stock — HSD', d.hsd.val]);
      sheet.addRow(['Current Assets', 'Accounts Receivable', d.totalReceivables]);
      sheet.addRow(['', 'TOTAL ASSETS', totalAssets]);
      sheet.addRow([]);

      sheet.addRow(['LIABILITIES & CAPITAL', '', '']);
      sheet.addRow(['Liabilities', 'Accounts Payable', d.totalPayables]);
      d.capital.forEach(c => sheet.addRow(['Capital', c.name, c.bal]));
      sheet.addRow(['', 'TOTAL LIAB + EQUITY', totalEquity]);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BalanceSheet_Bill_${startDate || 'All'}_${today()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast('Excel Bill downloaded', 'success');
    } catch (err) {
      console.error('Excel Bill export failed:', err);
      toast('Failed to generate Excel Bill. Please try again.', 'error');
    }
  };

  const saveAsset = async () => {
    if (!newAssetName || !newAssetAmount) { toast('Enter name and amount', 'error'); return; }
    setIsSaving(true);
    try {
      let catId = assetCategories.find(c => c.name.toLowerCase() === newAssetName.toLowerCase())?.id;
      if (!catId) catId = await store.addAssetCategory(newAssetName) as any;
      await store.addAssetEntry({ categoryId: catId!, date: today(), description: 'Balance Sheet', debit: parseFloat(newAssetAmount) || 0, credit: 0, balance: 0 });
      setNewAssetName(''); setNewAssetAmount(''); setShowAssetEntry(false);
      toast('Asset saved', 'success');
    } catch { toast('Failed', 'error'); } finally { setIsSaving(false); }
  };

  const saveCapital = async () => {
    if (!newCapName || !newCapAmount) { toast('Enter name and amount', 'error'); return; }
    setIsSaving(true);
    try {
      let catId = capitalCategories.find(c => c.name.toLowerCase() === newCapName.toLowerCase())?.id;
      if (!catId) catId = await store.addCapitalCategory(newCapName) as any;
      await store.addCapitalEntry({ categoryId: catId!, date: today(), description: 'Balance Sheet', amount: parseFloat(newCapAmount) || 0, balance: 0 } as any);
      setNewCapName(''); setNewCapAmount(''); setShowCapEntry(false);
      toast('Capital saved', 'success');
    } catch { toast('Failed', 'error'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden"
      style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", fontSize: 12, background: '#f7f8fa' }}>

      <header className="shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1e2634] flex items-center justify-center">
            <Scale className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-slate-800 tracking-tight leading-none">Balance Sheet</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 tracking-wide">Statement of Financial Position</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
             <input type="date" value={startDate} onChange={e => store.updateSettings({ startDate: e.target.value })}
               className="bg-transparent border-none text-[11px] font-semibold text-slate-700 outline-none px-2 cursor-pointer" />
             <span className="text-slate-400 font-bold">→</span>
             <input type="date" value={endDate} onChange={e => store.updateSettings({ endDate: e.target.value })}
               className="bg-transparent border-none text-[11px] font-semibold text-slate-700 outline-none px-2 cursor-pointer" />
             {(startDate || endDate) && (
               <button onClick={() => store.updateSettings({ startDate: '', endDate: '' })}
                 className="p-1 hover:bg-white rounded-md text-red-500 transition-colors" title="Clear Dates">
                 <XCircle className="w-3.5 h-3.5" />
               </button>
             )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportToExcel} 
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm"
              title="Download Excel Bill"
            >
              <Download className="w-4 h-4" /> EXCEL BILL
            </button>
            <button onClick={() => setIsPrintModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200" title="Print PDF">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSummaryReport(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm">
              <FileText className="w-3.5 h-3.5" /> SUMMARY
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 space-y-6 w-full lg:w-1/2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionBar subtitle="Non-Current Assets">Fixed Assets</SectionBar>
                <div className="overflow-auto" style={{ scrollbarWidth: 'thin', maxHeight: 300 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <TH action={<button onClick={() => setShowAssetEntry(true)} className="p-0.5 hover:bg-slate-200 rounded cursor-pointer text-blue-600"><PlusCircle className="w-3.5 h-3.5" /></button>}>Asset Name</TH>
                        <TH right>Net Balance (&#8360;)</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {showAssetEntry && (
                        <tr style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
                          <td style={{ ...tdBase }}><input autoFocus type="text" placeholder="Asset name…" value={newAssetName} onChange={e => setNewAssetName(e.target.value)} style={{ width: '100%', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 500, color: '#1d4ed8' }} /></td>
                          <td style={{ ...tdBase, textAlign: 'right' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}><input type="number" placeholder="0.00" value={newAssetAmount} onChange={e => setNewAssetAmount(e.target.value)} style={{ width: '100%', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 600, textAlign: 'right' }} /><button onClick={saveAsset} disabled={isSaving} style={{ padding: '4px 6px', borderRadius: 4, background: isSaving ? '#94a3b8' : '#2563eb', color: '#fff', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}>{isSaving ? <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Check size={10} />}</button><button onClick={() => setShowAssetEntry(false)} style={{ padding: '4px 6px', borderRadius: 4, background: '#e2e8f0', color: '#475569', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}><X size={10} /></button></div></td>
                        </tr>
                      )}
                      {d.allAssets.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ ...tdBase, fontWeight: 500, color: '#374151' }}>{a.name}</td><td style={{ ...tdBase, textAlign: 'right', fontWeight: 600, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(a.bal)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><DarkFooterRow label="Fixed Assets Total" value={d.totalFixedAssets} /></tfoot>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionBar subtitle="Inventory & Receivables">Current Assets</SectionBar>
                <div className="overflow-auto" style={{ scrollbarWidth: 'thin', maxHeight: 300 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr><TH>Stock & Inventory</TH><TH right>Qty (L)</TH><TH right>Avg Purchase Price</TH><TH right>Valuation (&#8360;)</TH></tr>
                    </thead>
                    <tbody>
                      {[{ label: 'Stock — PMG', qty: d.pmg.qty, avg: d.pmg.avg, val: d.pmg.val }, { label: 'Stock — HSD', qty: d.hsd.qty, avg: d.hsd.avg, val: d.hsd.val }].map((r, i) => (
                        <tr key={i} style={{ background: '#eff6ff', borderBottom: '1px solid #f1f5f9' }}><td style={{ ...tdBase, fontWeight: 600, color: '#1d4ed8' }}>{r.label}</td><td style={{ ...tdBase, textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{r.qty.toLocaleString()}</td><td style={{ ...tdBase, textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.avg)}</td><td style={{ ...tdBase, textAlign: 'right', fontWeight: 600, color: '#1d4ed8', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(r.val)}</td></tr>
                      ))}
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ ...tdBase, fontWeight: 600, color: '#1d4ed8' }}>Accounts Receivable</td><td colSpan={2} style={{ ...tdBase }}></td><td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, color: '#1d4ed8', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(d.totalReceivables)}</td></tr>
                    </tbody>
                    <tfoot><DarkFooterRow label="Current Assets Total" colSpan={3} value={d.pmg.val + d.hsd.val + d.totalReceivables} /></tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6 w-full lg:w-1/2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionBar subtitle="Payables & Loans">Liabilities</SectionBar>
                <div className="overflow-auto" style={{ scrollbarWidth: 'thin', maxHeight: 300 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead><tr><TH>Particulars</TH><TH right>Amount (&#8360;)</TH></tr></thead>
                    <tbody><tr style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}><td style={{ ...tdBase, fontWeight: 600, color: '#c2410c' }}>Accounts Payable</td><td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(d.totalPayables)}</td></tr></tbody>
                    <tfoot><DarkFooterRow label="Total Liabilities" value={d.totalPayables} /></tfoot>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionBar subtitle="Owners' Equity">Capital Account</SectionBar>
                <div className="overflow-auto" style={{ scrollbarWidth: 'thin', maxHeight: 300 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead><tr><TH action={<button onClick={() => setShowCapEntry(true)} className="p-0.5 hover:bg-slate-200 rounded cursor-pointer text-indigo-600"><PlusCircle className="w-3.5 h-3.5" /></button>}>Particulars</TH><TH right>Balance (&#8360;)</TH></tr></thead>
                    <tbody>
                      {showCapEntry && (
                        <tr style={{ background: '#eef2ff', borderBottom: '1px solid #c7d2fe' }}>
                          <td style={{ ...tdBase }}><input autoFocus type="text" placeholder="Capital name…" value={newCapName} onChange={e => setNewCapName(e.target.value)} style={{ width: '100%', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 500, color: '#4338ca' }} /></td>
                          <td style={{ ...tdBase, textAlign: 'right' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}><input type="number" placeholder="0.00" value={newCapAmount} onChange={e => setNewCapAmount(e.target.value)} style={{ width: '100%', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 600, textAlign: 'right' }} /><button onClick={saveCapital} disabled={isSaving} style={{ padding: '4px 6px', borderRadius: 4, background: isSaving ? '#94a3b8' : '#4f46e5', color: '#fff', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}>{isSaving ? <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <Check size={10} />}</button><button onClick={() => setShowCapEntry(false)} style={{ padding: '4px 6px', borderRadius: 4, background: '#e2e8f0', color: '#475569', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}><X size={10} /></button></div></td>
                        </tr>
                      )}
                      {d.capital.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ ...tdBase, fontWeight: 600, color: '#4338ca' }}>{c.name}</td><td style={{ ...tdBase, textAlign: 'right', fontWeight: 600, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(c.bal)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><DarkFooterRow label="Total Capital" value={d.totalCapital} /></tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: '#1e2634', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.1)' }}><p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Total Assets</p><p style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(totalAssets)}</p></div>
              <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.1)' }}><p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Total Liabilities + Capital</p><p style={{ fontSize: 22, fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>&#8360; {formatCurrency(totalEquity)}</p></div>
              <div style={{ padding: '20px 24px', background: balanced ? '#059669' : '#dc2626' }}><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Audit Status</p><p style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>{balanced ? '✓ Balanced' : '⚠ Unbalanced'}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Assets = Liabilities + Equity</p></div>
            </div>
          </div>
        </div>
      </div>

      {isPrintModalOpen && <PrintReportModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} type="balancesheet" title="Balance Sheet" dateRange={{ from: startDate, to: endDate }} data={[d]} />}
      {showSummaryReport && <PrintReportModal isOpen={showSummaryReport} onClose={() => setShowSummaryReport(false)} title="Balance Sheet Executive Summary" columns={[{ header: 'Metric', accessor: 'label' }, { header: 'Value', accessor: 'value', align: 'right' }]} data={[{ label: 'Total Assets', value: `₨ ${formatCurrency(totalAssets)}` }, { label: 'Fixed Assets', value: `₨ ${formatCurrency(d.totalFixedAssets)}` }, { label: 'Current Assets (Inventory/Receivables)', value: `₨ ${formatCurrency(d.pmg.val + d.hsd.val + d.totalReceivables)}` }, { label: '---', value: '---' }, { label: 'Total Liabilities + Equity', value: `₨ ${formatCurrency(totalEquity)}` }, { label: 'Total Liabilities', value: `₨ ${formatCurrency(d.totalPayables)}` }, { label: 'Total Capital/Equity', value: `₨ ${formatCurrency(d.totalCapital)}` }, { label: '---', value: '---' }, { label: 'Audit Status', value: balanced ? '✓ Balanced' : '⚠ Unbalanced' }]} dateRange={{ from: startDate, to: endDate }} />}
    </div>
  );
}
