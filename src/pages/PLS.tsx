import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, cn, computeFuelStats } from '../lib/utils';
import { FileText, Download, Calendar, Printer, ChevronRight } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import PrintReportModal from '../components/modals/PrintReportModal';

function Amt({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn('tabular-nums whitespace-nowrap font-[inherit]', className)}
      style={{ color: 'inherit' }}
    >
      &#8360; {formatCurrency(value)}
    </span>
  );
}

function SectionBar({ children, rightTitle, subtitle }: { children: React.ReactNode; rightTitle?: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-[#000000] text-white select-none">
      <div className="flex-1 flex items-center justify-between pr-10 border-r border-white/20">
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">{children}</span>
      </div>
      <div className="flex-1 flex items-center justify-start pl-56">
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">{rightTitle || ' '}</span>
        {subtitle && <span className="text-[10px] text-slate-300 tracking-wide uppercase font-medium ml-auto pr-2">{subtitle}</span>}
      </div>
    </div>
  );
}

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn(
      'sticky top-0 z-10 bg-[#000000] px-4 py-2',
      'text-[10px] font-bold uppercase tracking-[0.1em] text-white',
      'border-b border-white/30 whitespace-nowrap',
      right ? 'text-right' : 'text-left'
    )} style={{ color: 'white' }}>
      {children}
    </th>
  );
}

function FooterRow({ label, colSpan, value }: { label: string; colSpan?: number; value: number }) {
  return (
    <tr style={{ background: '#000000' }}>
      <td
        colSpan={colSpan ?? 3}
        style={{ padding: '14px 16px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffffff', borderTop: '2px solid #333' }}
      >
        <span style={{ color: '#ffffff' }}>{label}</span>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, fontWeight: 1000, color: '#ffffff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', borderTop: '2px solid #333' }}>
        <span style={{ color: '#ffffff' }}>₨ {formatCurrency(value)}</span>
      </td>
    </tr>
  );
}

function FooterRow2({ label, value }: { label: string; value: number }) {
  return (
    <tr style={{ background: '#000000' }}>
      <td style={{ padding: '14px 16px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffffff', borderTop: '2px solid #333' }}>
        <span style={{ color: '#ffffff' }}>{label}</span>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, fontWeight: 1000, color: '#ffffff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', borderTop: '2px solid #333' }}>
        <span style={{ color: '#ffffff' }}>₨ {formatCurrency(value)}</span>
      </td>
    </tr>
  );
}

// ─── Inline Editable Cell ────────────────────────────────────────────────────
function EditableCell({
  value, fieldKey, isQty = false, prefix = '', onSave,
}: {
  value: number; fieldKey: string; isQty?: boolean; prefix?: string;
  onSave: (k: string, v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(isQty ? Math.round(value).toString() : value.toFixed(2));
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 10);
  };
  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onSave(fieldKey, n);
    setEditing(false);
  };

  if (editing) return (
    <input ref={inputRef} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      style={{ width: '90%', textAlign: 'right', fontSize: 12, fontWeight: 700,
        border: '2px solid #3b82f6', borderRadius: 4, padding: '2px 6px',
        outline: 'none', background: '#eff6ff', color: '#1d4ed8' }}
    />
  );

  return (
    <span onDoubleClick={startEdit} title="Double-click to edit"
      style={{ cursor: 'cell', display: 'block', textAlign: 'right',
        userSelect: 'none', borderBottom: '1px dashed transparent' }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#93c5fd')}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
    >
      {prefix}{isQty ? Math.round(value).toLocaleString() : value.toFixed(2)}
    </span>
  );
}

export default function PLS() {
  const store = useStore();
  const { purchases, sales, expenseEntries, expenseCategories, updateSettings } = store;
  const settings = store.settings;
  const [startDate, setStartDate] = useState(settings.startDate || '');
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleSaveOverride = useCallback((key: string, val: number) => {
    const current = store.settings.plsOverrides || {};
    updateSettings({ plsOverrides: { ...current, [key]: val } });
  }, [store.settings.plsOverrides, updateSettings]);

  const triggerPrint = () => {
    setIsPrintModalOpen(true);
  };

  const setPreset = (type: 'today' | 'month' | 'year' | 'all') => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    setEndDate(today);
    
    if (type === 'today') setStartDate(today);
    else if (type === 'month') setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    else if (type === 'year') setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
    else setStartDate('');
  };

  const data = useMemo(() => {
    try {
      const ov = settings.plsOverrides || {};

      const hsd = computeFuelStats('HSD', purchases, sales, ov, startDate, endDate);
      const pmg = computeFuelStats('PMG', purchases, sales, ov, startDate, endDate);

      const groupedExpenses = expenseCategories.map(cat => {
        const filtered = expenseEntries
          .filter(e => e.categoryId === cat.id && (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate));
        const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
        return { categoryName: cat.name, amount: total, count: filtered.length };
      }).filter(e => e.amount > 0);

      return { hsd, pmg, detailedExpenses: groupedExpenses, totalExpenses: groupedExpenses.reduce((s, e) => s + e.amount, 0), error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [purchases, sales, expenseEntries, expenseCategories, startDate, endDate, settings.plsOverrides]);

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('P&L Analysis');
      
      sheet.columns = [
        { width: 30 }, { width: 15 }, { width: 15 }, { width: 25 },
        { width: 5 },
        { width: 30 }, { width: 15 }, { width: 15 }, { width: 25 }
      ];
      
      sheet.addRow(['PROFIT AND LOSS ANALYSIS']).font = { bold: true, size: 16 };
      sheet.addRow([`Period: ${startDate || 'All Time'} to ${endDate}`]);
      sheet.addRow([]);

      sheet.addRow(['PURCHASES', '', '', '', '', 'SALES & CLOSING', '', '', '']).font = { bold: true };
      sheet.addRow(['Particulars', 'Qty', 'Rate', 'Amount', '', 'Particulars', 'Qty', 'Rate', 'Amount']).font = { bold: true };

      // Basic mapping
      if (data.pmg && data.hsd) {
        sheet.addRow(['PMG Purchase', data.pmg.purchase.qty, data.pmg.purchase.avg, data.pmg.purchase.amt, '', 'PMG Sales', data.pmg.sale.qty, data.pmg.sale.avg, data.pmg.sale.amt]);
        sheet.addRow(['HSD Purchase', data.hsd.purchase.qty, data.hsd.purchase.avg, data.hsd.purchase.amt, '', 'HSD Sales', data.hsd.sale.qty, data.hsd.sale.avg, data.hsd.sale.amt]);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PL_Analysis_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      alert('Excel Download Started!');
    } catch (err) {
      alert('Excel Error: ' + err);
    }
  };

  if (data.error) return <div className="p-10 text-red-500 text-sm">Error: {data.error}</div>;

  const debitTotal  = (data.pmg?.purchase.amt || 0) + (data.hsd?.purchase.amt || 0);
  const creditTotal = (data.pmg?.sale.amt || 0) + (data.hsd?.sale.amt || 0) + (data.pmg?.stock.amt || 0) + (data.hsd?.stock.amt || 0);
  const grossProfit = creditTotal - debitTotal;
  const netProfit   = grossProfit - (data.totalExpenses || 0);
  const isProfit    = netProfit >= 0;

  const tdStyle = (color?: string): React.CSSProperties => ({
    padding: '10px 16px', fontSize: 12, fontWeight: 500,
    color: color ?? '#374151', borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap' as const,
  });
  const tdNum = (color?: string): React.CSSProperties => ({
    ...tdStyle(color), textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
  });

  return (
    <div className="flex flex-col h-full w-full overflow-hidden"
      style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", fontSize: 12, background: '#f7f8fa' }}>

      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm sticky top-0 z-[100] print:hidden overflow-hidden">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#1e2634] p-2 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Profit &amp; Loss Analysis</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Consolidated Statement</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          {/* Quick Stats Summary */}
          <div className="hidden md:flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-lg">
             <div className="text-center border-r border-slate-200 pr-4">
               <p className="text-[8px] text-slate-400 font-bold uppercase">Gross</p>
               <p className={cn("text-xs font-black", grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>&#8360; {formatCurrency(grossProfit)}</p>
             </div>
             <div className="text-center">
               <p className="text-[8px] text-slate-400 font-bold uppercase">Net</p>
               <p className={cn("text-xs font-black", isProfit ? 'text-emerald-600' : 'text-red-600')}>&#8360; {formatCurrency(netProfit)}</p>
             </div>
          </div>

          {/* Date Control */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {['today', 'month', 'year'].map(p => (
                <button key={p} onClick={() => setPreset(p as any)} className="px-2.5 py-1 text-[9px] font-bold uppercase hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">{p}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[10px] font-bold text-slate-700 bg-transparent outline-none" />
              <span className="text-slate-300">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[10px] font-bold text-slate-700 bg-transparent outline-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {Object.keys(settings.plsOverrides || {}).length > 0 && (
              <button
                onClick={() => updateSettings({ plsOverrides: {} })}
                title="Reset all manual overrides back to calculated values"
                className="p-2 lg:px-3 lg:py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-sm flex items-center gap-1.5 relative z-[110]"
              >
                <span className="text-[10px] font-black uppercase">↺ Reset</span>
                <span className="bg-white text-amber-600 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {Object.keys(settings.plsOverrides || {}).length}
                </span>
              </button>
            )}
            <button onClick={() => { alert('Exporting Excel...'); handleExportExcel(); }} className="p-2 lg:px-4 lg:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 relative z-[110]">
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px] font-extrabold uppercase">Excel</span>
            </button>
            <button onClick={() => { alert('Preparing Print...'); triggerPrint(); }} className="p-2 lg:px-4 lg:py-2 bg-[#1e2634] text-white rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2 relative z-[110]">
              <Printer className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px] font-extrabold uppercase">Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16">

          {/* PURCHASES & SALES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <SectionBar rightTitle="Sales" subtitle="Dr / Cr">Purchases</SectionBar>
            <div className="flex gap-10 p-4 divide-x divide-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>

              {/* DR side */}
              <div className="flex-1" style={{ minWidth: 700 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '45%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <TH>Particulars — Dr</TH>
                      <TH right>Qty (L)</TH>
                      <TH right>Avg Rate</TH>
                      <TH right>Amount (&#8360;)</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Purchases — PMG', ...data.pmg!.purchase, qk: 'pur_pmg_qty', ak: 'pur_pmg_avg' },
                      { label: 'Purchases — HSD', ...data.hsd!.purchase, qk: 'pur_hsd_qty', ak: 'pur_hsd_avg' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle()}>{row.label}</td>
                        <td style={tdNum()}>
                          <EditableCell value={row.qty} fieldKey={row.qk} isQty onSave={handleSaveOverride} />
                        </td>
                        <td style={tdNum()}>
                          <EditableCell value={row.avg} fieldKey={row.ak} onSave={handleSaveOverride} />
                        </td>
                        <td style={tdNum('#1e293b')}>&#8360; {formatCurrency(row.amt)}</td>
                      </tr>
                    ))}
                    {/* Filler rows to align with CR side */}
                    {Array.from({ length: Math.max(0, 4 - 2) }).map((_, i) => (
                      <tr key={`f-${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}><td colSpan={4} style={{ ...tdStyle(), height: 43 }}>&nbsp;</td></tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <FooterRow label="Total Purchases" colSpan={3} value={debitTotal} />
                  </tfoot>
                </table>
              </div>

              {/* CR side */}
              <div className="flex-1 pl-10 border-l border-slate-200" style={{ minWidth: 700 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '45%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <TH>Sales and Closing</TH>
                      <TH right>Qty (L)</TH>
                      <TH right>Avg Rate</TH>
                      <TH right>Amount (&#8360;)</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Sales — PMG',            ...data.pmg!.sale,  isStock: false, qk: 'sal_pmg_qty', ak: 'sal_pmg_avg' },
                      { label: 'Sales — HSD',            ...data.hsd!.sale,  isStock: false, qk: 'sal_hsd_qty', ak: 'sal_hsd_avg' },
                      { label: 'Closing Stock PMG (c/d)', qty: data.pmg!.stock.qty, avg: data.pmg!.stock.avg, amt: data.pmg!.stock.amt, isStock: true, qk: '', ak: '' },
                      { label: 'Closing Stock HSD (c/d)', qty: data.hsd!.stock.qty, avg: data.hsd!.stock.avg, amt: data.hsd!.stock.amt, isStock: true, qk: '', ak: '' },
                    ].map((row, i) => (
                      <tr key={i} style={{ background: row.isStock ? '#eff6ff' : '', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...tdStyle(row.isStock ? '#1d4ed8' : undefined), paddingLeft: row.isStock ? 32 : 16 }}>{row.label}</td>
                        <td style={tdNum()}>
                          {row.isStock
                            ? <span style={{ display: 'block', textAlign: 'right' }}>{Math.round(row.qty).toLocaleString()}</span>
                            : <EditableCell value={row.qty} fieldKey={row.qk} isQty onSave={handleSaveOverride} />}
                        </td>
                        <td style={tdNum()}>
                          {row.isStock
                            ? <span style={{ display: 'block', textAlign: 'right' }}>{formatCurrency(row.avg)}</span>
                            : <EditableCell value={row.avg} fieldKey={row.ak} onSave={handleSaveOverride} />}
                        </td>
                        <td style={tdNum(row.isStock ? '#1d4ed8' : '#1e293b')}>&#8360; {formatCurrency(row.amt)}</td>
                      </tr>
                    ))}
                    {/* Filler rows to align with DR side */}
                    {Array.from({ length: Math.max(0, 2 - 4) }).map((_, i) => (
                      <tr key={`f-${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}><td colSpan={4} style={{ ...tdStyle(), height: 43 }}>&nbsp;</td></tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <FooterRow label="Total Sales & Closing" colSpan={3}
                      value={creditTotal} />
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* EXPENSES SUM UP */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <SectionBar rightTitle="Gross Profit" subtitle="Dr / Cr">Expenses Sum Up</SectionBar>
            <div className="flex gap-10 p-4 divide-x divide-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>

              {/* DR: Expenses */}
              <div className="flex-1" style={{ minWidth: 550 }}>
                <div className="overflow-auto" style={{ maxHeight: 400, scrollbarWidth: 'thin' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '45%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '40%' }} />
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ background: '#000000', padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#fff', borderBottom: '2px solid #333' }}>Expense Category</th>
                        <th style={{ background: '#000000', padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#fff', borderBottom: '2px solid #333' }}>Entries</th>
                        <th style={{ background: '#000000', padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#fff', borderBottom: '2px solid #333' }}>Amount (₨)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detailedExpenses.length === 0 && (
                        <tr><td colSpan={3} style={{ ...tdStyle('#94a3b8'), textAlign: 'center', padding: 32 }}>No expenses recorded</td></tr>
                      )}
                      {data.detailedExpenses.map((e: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={tdStyle()}>{e.categoryName}</td>
                          <td style={tdNum()}>{e.count}</td>
                          <td style={tdNum('#dc2626')}>₨ {formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                   <colgroup>
                      <col style={{ width: '45%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '40%' }} />
                    </colgroup>
                  <tfoot>
                    <FooterRow label="Total Expenses" colSpan={2} value={data.totalExpenses} />
                  </tfoot>
                </table>
              </div>

              {/* CR: Gross Profit b/d */}
              <div className="flex-1 pl-10 border-l border-slate-200" style={{ minWidth: 450 }}>
                <div className="overflow-auto" style={{ maxHeight: 400, scrollbarWidth: 'thin' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '50%' }} />
                      <col style={{ width: '50%' }} />
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ background: '#000000', padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#fff', borderBottom: '2px solid #333' }}>Gross Profit</th>
                        <th style={{ background: '#000000', padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#fff', borderBottom: '2px solid #333' }}>Amount (₨)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: '#f0fdf4', borderTop: '2px solid #e2e8f0' }}>
                        <td style={{ padding: '18px 20px', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b' }}>Gross Profit b/d</td>
                        <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: '#059669' }}>₨ {formatCurrency(grossProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SUMMARY CARD (Now on the right side) */}
                <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                  <SectionBar subtitle="Consolidated">Profit &amp; Loss Summary</SectionBar>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ChevronRight size={14} color="#cbd5e1" /> <span style={{ fontWeight: 600 }}>Gross Profit</span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          ₨ {formatCurrency(grossProfit)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ChevronRight size={14} color="#cbd5e1" /> <span style={{ fontWeight: 600 }}>Total Operating Expenses</span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          ₨ {formatCurrency(data.totalExpenses)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr style={{ background: isProfit ? '#f0fdf4' : '#fef2f2', borderTop: '2px solid #e2e8f0' }}>
                        <td style={{ padding: '18px 20px', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#1e293b' }}>
                          {isProfit ? 'Net Business Profit' : 'Net Business Loss'}
                        </td>
                        <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 20, fontWeight: 900, color: isProfit ? '#059669' : '#dc2626' }}>
                          ₨ {formatCurrency(Math.abs(netProfit))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="pls"
        title="Profit and Loss Analysis"
        fromDate={startDate}
        toDate={endDate}
        data={[{
          ...data,
          debitTotal,
          creditTotal,
          grossProfit,
          netProfit
        }]}
      />
    </div>
  );
}
