import React, { useState, useRef, useMemo } from 'react';
import { X, Printer, FileText, Download, Loader2, Table } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import PrintHeader from '../printing/PrintHeader';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { writeFile } from '@tauri-apps/plugin-fs';
import { message, save as saveDialog } from '@tauri-apps/plugin-dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  type?: 'sale' | 'purchase' | 'expense' | 'asset' | 'liability' | 'capital' | 'customer' | 'stock' | 'customer_summary' | 'asset_summary' | 'liability_summary' | 'expense_summary' | 'capital_summary' | 'pls' | 'balancesheet';
  title?: string;
  customerPhone?: string;
  fromDate?: string;
  toDate?: string;
  dateRange?: { from: string; to: string } | string;
  columns?: { header: string; accessor: string; align?: 'left' | 'right' | 'center'; isCurrency?: boolean }[];
  totals?: Record<string, number>;
}

const ROWS_PER_PAGE = 22;

// ── Amount in words ──────────────────────────────────────────────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function toWords(n: number): string {
  const i = Math.floor(Math.abs(n));
  function conv(x: number): string {
    if (x === 0) return '';
    if (x < 20) return ONES[x] + ' ';
    if (x < 100) return TENS[Math.floor(x / 10)] + (x % 10 ? ' ' + ONES[x % 10] : '') + ' ';
    if (x < 1000) return ONES[Math.floor(x / 100)] + ' Hundred ' + conv(x % 100);
    if (x < 100000) return conv(Math.floor(x / 1000)) + 'Thousand ' + conv(x % 1000);
    if (x < 10000000) return conv(Math.floor(x / 100000)) + 'Lakh ' + conv(x % 100000);
    return conv(Math.floor(x / 10000000)) + 'Crore ' + conv(x % 10000000);
  }
  return i === 0 ? 'PKR Zero Only' : 'PKR ' + conv(i).trim() + ' Only';
}

export default function PrintReportModal({
  isOpen, onClose, data = [], type, title: customTitle,
  customerPhone, fromDate, toDate, dateRange: customDateRange,
  columns: dynamicColumns, totals: dynamicTotals
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const dates = useMemo(() => (data || []).map(x => x.date).filter(Boolean).sort(), [data]);
  const dateRangeStr = useMemo(() => {
    if (customDateRange) {
      if (typeof customDateRange === 'string') return customDateRange;
      return `${formatDate(customDateRange.from)} — ${formatDate(customDateRange.to)}`;
    }
    if (fromDate && toDate) return `${formatDate(fromDate)} — ${formatDate(toDate)}`;
    if (fromDate) return `From ${formatDate(fromDate)}`;
    if (toDate) return `Up to ${formatDate(toDate)}`;
    if (dates.length) return `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`;
    return 'Full History';
  }, [dates, fromDate, toDate, customDateRange]);

  const printedAt = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }, []);

  const chunks = useMemo(() => {
    if (type === 'pls') return [data];
    if (type === 'balancesheet') {
      const d = data[0];
      if (!d) return [[]];
      const leftRows = d.allAssets || [];
      const rightRows = [...(d.liabilities || []), ...(d.capital || [])];
      const maxRows = Math.max(leftRows.length, rightRows.length);

      // Page 1 can take ~12 rows because Section 1 is there.
      // Subsequent pages can take ~22 rows.
      const result = [];
      const p1Rows = 12;
      const otherRows = 22;

      result.push({ ...d, rowStart: 0, rowEnd: Math.min(maxRows, p1Rows), isFirstPage: true });
      let current = p1Rows;
      while (current < maxRows) {
        result.push({ ...d, rowStart: current, rowEnd: Math.min(maxRows, current + otherRows), isFirstPage: false });
        current += otherRows;
      }
      return result;
    }
    const arr: any[][] = [];
    for (let i = 0; i < data.length; i += ROWS_PER_PAGE) arr.push(data.slice(i, i + ROWS_PER_PAGE));
    if (arr.length === 0) arr.push([]);
    return arr;
  }, [data, type]);

  const colCount = useMemo(() => {
    if (dynamicColumns) return dynamicColumns.length;
    if (type === 'purchase') return 9;
    if (type === 'sale' || type === 'asset' || type === 'liability' || type === 'capital' || type === 'customer' || type === 'stock' || type === 'customer_summary' || type === 'asset_summary' || type === 'liability_summary' || type === 'capital_summary') return 5;
    return 3;
  }, [type, dynamicColumns]);

  if (isOpen === false) return null;

  const handleGeneratePDF = async () => {
    if (!contentRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = contentRef.current.querySelectorAll('.report-page');

      for (let i = 0; i < pages.length; i++) {
        const dataUrl = await toPng(pages[i] as HTMLElement, {
          quality: 0.95,
          pixelRatio: 2,
        });
        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      }

      const pdfData = pdf.output('arraybuffer');
      const filename = `Report_${type || 'Summary'}_${new Date().getTime()}.pdf`;
      const path = await saveDialog({
        defaultPath: filename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (path) {
        await writeFile(path, new Uint8Array(pdfData));
        await message('PDF Report has been saved successfully!', { title: 'Success', kind: 'info' });
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      await message('Failed to generate PDF. Please try again.', { title: 'Error', kind: 'error' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Report</title><style>
      @page{size:A4 portrait;margin:0;}
      *,*::before,*::after{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
      html,body{margin:0;padding:0;background:#fff;font-family:'Times New Roman',serif;}
      .page{width:210mm;height:297mm;padding:12mm 10mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden;position:relative;background:#fff;}
    </style></head><body>${contentRef.current?.innerHTML}</body></html>`);
    doc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 800);
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      let cols: any[] = [];
      if (dynamicColumns) {
        cols = dynamicColumns.map(c => ({ header: c.header, key: c.accessor, width: 20 }));
      } else if (type === 'customer_summary') {
        cols = [
          { header: 'Customer Name', key: 'name', width: 30 },
          { header: 'Debit (DR)', key: 'totalDebit', width: 15 },
          { header: 'Credit (CR)', key: 'totalCredit', width: 15 },
          { header: 'Balance', key: 'balance', width: 20 }
        ];
      } else if (type === 'purchase') {
        cols = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Invoice', key: 'invoiceNo', width: 15 },
          { header: 'Description', key: 'description', width: 30 },
          { header: 'Qty', key: 'quantity', width: 10 },
          { header: 'Total', key: 'totalAmount', width: 15 }
        ];
      } else {
        cols = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Description', key: 'description', width: 35 },
          { header: 'Amount', key: 'amount', width: 15 }
        ];
      }

      worksheet.columns = cols;
      data.forEach(item => worksheet.addRow(item));

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `Report_${type || 'Summary'}_${new Date().getTime()}.xlsx`;

      const path = await saveDialog({
        defaultPath: filename,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      });

      if (path) {
        await writeFile(path, new Uint8Array(buffer));
        await message('Excel file has been saved successfully!', { title: 'Success', kind: 'info' });
      }
    } catch (error) {
      console.error('Excel Export Error:', error);
      await message('Failed to export Excel. Please try again.', { title: 'Error', kind: 'error' });
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Times New Roman', serif",
      overflowY: 'auto', paddingBottom: 100,
    }}>
      {/* Control Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, width: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '12px 20px', gap: 12, boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}>
              <FileText style={{ width: 18, height: 18, color: '#3b82f6' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Preview</span>
              <span style={{ color: '#64748b', fontSize: 10 }}>{data.length} Records • {chunks.length} Pages</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={isGeneratingPDF}
            onClick={handleGeneratePDF}
            style={{
              flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 12, background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff',
              fontWeight: 900, fontSize: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
              opacity: isGeneratingPDF ? 0.7 : 1
            }}
          >
            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate PDF
          </button>
          <button
            onClick={handleExportExcel}
            style={{
              flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
              fontWeight: 900, fontSize: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase'
            }}
          >
            <Table style={{ width: 18, height: 18 }} />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="md-only"
            style={{
              width: 100, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 12, background: '#1e293b', color: '#fff',
              fontWeight: 900, fontSize: 12, border: '1px solid #334155', cursor: 'pointer', textTransform: 'uppercase'
            }}
          >
            <Printer style={{ width: 18, height: 18 }} /> Print
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .md-only { display: none !important; }
        }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          .report-page { margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>

      <div ref={contentRef} className="page-print-container" style={{ width: '210mm', margin: '20px auto' }}>
        {chunks.map((chunk, pi) => {
          const isLast = pi === chunks.length - 1;
          const total = Array.isArray(chunk) ? chunk.reduce((s, x) => s + (x.amount || x.totalAmount || x.debit || x.credit || 0), 0) : 0;
          const isLedger = type === 'asset' || type === 'liability' || type === 'capital' || type === 'customer';
          const isSale = type === 'sale';
          const isPurchase = type === 'purchase';
          const isExpense = type === 'expense';
          const isStock = type === 'stock';
          const isCustSum = type === 'customer_summary';
          const isAssetSum = type === 'asset_summary';
          const isLiabSum = type === 'liability_summary';
          const isExpSum = type === 'expense_summary';
          const isCapSum = type === 'capital_summary';
          const isSummary = isCustSum || isAssetSum || isLiabSum || isExpSum || isCapSum;
          const colCount = dynamicColumns ? dynamicColumns.length : (isPurchase ? 9 : (isSale || isLedger || isStock || isSummary ? 5 : 3));

          let grandTotal = 0;
          let totalQty = 0;
          let totalDebit = 0;
          let totalCredit = 0;

          // Prioritize dynamic totals if provided
          if (dynamicTotals) {
            if (dynamicTotals.total !== undefined) grandTotal = dynamicTotals.total;
            else if (dynamicTotals.amount !== undefined) grandTotal = dynamicTotals.amount;
            else if (dynamicTotals.balance !== undefined) grandTotal = dynamicTotals.balance;

            if (dynamicTotals.debit !== undefined) totalDebit = dynamicTotals.debit;
            if (dynamicTotals.credit !== undefined) totalCredit = dynamicTotals.credit;
            if (dynamicTotals.quantity !== undefined) totalQty = dynamicTotals.quantity;
          }

          // Fallback to type-based calculation if grandTotal is still 0 and not explicitly provided
          if (grandTotal === 0 && !dynamicTotals) {
            if (isSale) {
              grandTotal = data.reduce((s, x) => s + (x.amount ?? 0), 0);
              totalQty = data.reduce((s, x) => s + (x.quantity || 0), 0);
            } else if (isPurchase) {
              grandTotal = data.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
              totalQty = data.reduce((s, x) => s + (x.quantity || 0), 0);
            } else if (isExpense) {
              grandTotal = data.reduce((s, x) => s + (x.amount || 0), 0);
            } else if (isLedger) {
              totalDebit = data.reduce((s, x) => s + (x.debit || 0), 0);
              totalCredit = data.reduce((s, x) => s + (x.credit || 0), 0);
              grandTotal = totalDebit - totalCredit;
            } else if (isStock) {
              grandTotal = data[data.length - 1]?.balance || 0;
            } else if (isSummary) {
              totalDebit = data.reduce((s, x) => s + (x.totalDebit || x.debit || 0), 0);
              totalCredit = data.reduce((s, x) => s + (x.totalCredit || x.credit || 0), 0);
              grandTotal = data.reduce((s, x) => s + (x.total || x.balance || x.amount || 0), 0);
              if (grandTotal === 0 && (totalDebit !== 0 || totalCredit !== 0)) {
                grandTotal = totalDebit - totalCredit;
              }
            } else if (type === 'pls') {
              grandTotal = data[0]?.netProfit || 0;
            }
          }

          return (
            <div key={pi} className="report-page" style={{ position: 'relative', width: '210mm', height: '297mm', background: '#fff', color: '#000', padding: '5mm 5mm', margin: '0 auto 20px auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', borderRadius: '2px', pageBreakAfter: pi === chunks.length - 1 ? 'auto' : 'always', fontVariantNumeric: 'tabular-nums' }}>
              <PrintHeader />

              <div style={{ display: 'flex', justifyContent: 'space-between', border: '2px solid #111', padding: '6px 12px', marginBottom: '8px', fontSize: '14px', fontWeight: 1000, textTransform: 'uppercase', background: '#f9f9f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{customTitle || (type ? type.toUpperCase() + ' REPORT' : 'REPORT')}</span>
                  <span style={{ fontSize: '11px', color: '#555', textTransform: 'none', fontStyle: 'italic', fontWeight: 700 }}>Printed on: {printedAt}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span>Period: {dateRangeStr}</span>
                  <div style={{ fontSize: '11px', color: '#555', textTransform: 'none', fontStyle: 'italic', fontWeight: 700 }}>Page {pi + 1} / {chunks.length}</div>
                </div>
              </div>

              {type === 'customer' && pi === 0 && (
                <div style={{ marginBottom: 15, border: '1px solid #eee', padding: 10, background: '#fafafa' }}>
                  <div style={{ fontSize: 13, fontWeight: 1000, borderBottom: '1px solid #111', paddingBottom: 4, marginBottom: 6 }}>CLIENT DETAILS:</div>
                  <div style={{ display: 'flex', gap: 30 }}>
                    <div><span style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>NAME:</span> <span style={{ fontWeight: 1000 }}>{customTitle?.includes('—') ? customTitle.split('—')[1]?.trim() : 'N/A'}</span></div>
                    <div><span style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>PHONE:</span> <span style={{ fontWeight: 1000 }}>{customerPhone || '—'}</span></div>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {type !== 'pls' && type !== 'balancesheet' && (
                  <table style={{
                    width: '100%', borderCollapse: 'collapse', fontSize: isPurchase ? '9px' : '12px',
                    borderLeft: '2px solid #111', borderRight: '2px solid #111', borderBottom: '2px solid #111',
                    tableLayout: (isPurchase || dynamicColumns) ? 'fixed' : 'auto'
                  }}>
                    <thead style={{ background: '#f0f0f0', borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
                      <tr>
                        {dynamicColumns ? (
                          dynamicColumns.map((col, ci) => (
                            <th key={ci} style={{
                              padding: '10px 8px', borderRight: ci < dynamicColumns.length - 1 ? '1px solid #111' : 'none',
                              textAlign: col.align || 'left', fontSize: '14px'
                            }}>
                              {col.header}
                            </th>
                          ))
                        ) : isPurchase ? (
                          <>
                            <th style={{ width: '55px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '11px' }}>Date</th>
                            <th style={{ width: '55px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '11px' }}>Inv. No</th>
                            <th style={{ padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '11px' }}>Description</th>
                            <th style={{ width: '55px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '11px' }}>Vehicle</th>
                            <th style={{ width: '60px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right', fontSize: '11px' }}>Rate</th>
                            <th style={{ width: '55px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right', fontSize: '11px' }}>Qty (L)</th>
                            <th style={{ width: '80px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right', fontSize: '11px' }}>Carriage</th>
                            <th style={{ width: '105px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right', fontSize: '11px' }}>Amount</th>
                            <th style={{ width: '115px', padding: '6px 2px', textAlign: 'right', fontSize: '11px' }}>Total</th>
                          </>
                        ) : (
                          <>
                            {isCustSum ? <th style={{ width: '50px', padding: '10px 8px', borderRight: '1px solid #111', textAlign: 'left' }}>S.No</th> : <th style={{ padding: '10px 8px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '14px' }}>Date</th>}
                            <th style={{ padding: '10px 8px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '14px' }}>{(isStock) ? 'Details' : isCustSum ? 'Customer Name' : 'Description'}</th>
                            {isSale ? (
                              <>
                                <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Rate</th>
                                <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Qty (L)</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                              </>
                            ) : (isLedger || isCustSum) ? (
                              <>
                                <th style={{ width: '130px', padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Debit</th>
                                <th style={{ width: '130px', padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Credit</th>
                                <th style={{ width: '140px', padding: '8px', textAlign: 'right' }}>Balance</th>
                              </>
                            ) : isStock ? (
                              <>
                                <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>In (L)</th>
                                <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Out (L)</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                              </>
                            ) : (
                              <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                            )}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((row: any, idx: number) => {
                        if (dynamicColumns) {
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              {dynamicColumns.map((col, ci) => (
                                <td key={ci} style={{
                                  padding: '6px 8px', borderRight: ci < dynamicColumns.length - 1 ? '1px solid #f0f0f0' : 'none',
                                  textAlign: col.align || 'left', fontWeight: (ci === 0 || col.isCurrency) ? 'bold' : 'normal'
                                }}>
                                  {col.isCurrency ? formatCurrency(row[col.accessor]) : row[col.accessor]}
                                </td>
                              ))}
                            </tr>
                          );
                        }
                        const balVal = row.balance ?? 0;
                        const balText = (type === 'customer' || type === 'customer_summary')
                          ? `${formatCurrency(Math.abs(balVal))} ${balVal >= 0 ? '(Dr)' : '(Cr)'}`
                          : `₨ ${formatCurrency(balVal)}`;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            {isPurchase ? (
                              <>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', fontSize: '11px' }}>{formatDate(row.date)}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', fontWeight: 'bold', fontSize: '11px' }}>{row.invoiceNo || '—'}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', fontSize: '10px', wordBreak: 'break-word' }}>{row.description || '—'}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', fontSize: '11px' }}>{row.vehicleNo || '—'}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontSize: '11px' }}>{formatCurrency(row.rate)}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold', fontSize: '11px' }}>{row.quantity?.toLocaleString()}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontSize: '11px' }}>{formatCurrency(row.carriage)}</td>
                                <td style={{ padding: '5px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontSize: '11px' }}>{formatCurrency(row.amount)}</td>
                                <td style={{ padding: '5px 2px', textAlign: 'right', fontWeight: 'bold', fontSize: '11px' }}>{formatCurrency(row.totalAmount)}</td>
                              </>
                            ) : isCustSum ? (
                              <>
                                <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{(pi * ROWS_PER_PAGE) + idx + 1}</td>
                                <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', fontWeight: 'bold' }}>{row.name}</td>
                                <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{formatCurrency(row.totalDebit)}</td>
                                <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{formatCurrency(row.totalCredit)}</td>
                                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{balText}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                                <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', wordBreak: 'break-word', fontSize: '13px' }}>{row.description || row.details || row.type || '—'}</td>
                                {isSale ? (
                                  <>
                                    <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                                    <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{row.quantity?.toLocaleString()}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.amount)}</td>
                                  </>
                                ) : isLedger ? (
                                  <>
                                    <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                                    <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{type === 'customer' ? balText : formatCurrency(row.balance)}</td>
                                  </>
                                ) : isStock ? (
                                  <>
                                    <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.qtyIn ? `+${row.qtyIn.toLocaleString()}` : '—'}</td>
                                    <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.qtyOut ? `-${row.qtyOut.toLocaleString()}` : '—'}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{row.balance?.toLocaleString()} L</td>
                                  </>
                                ) : (
                                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.amount)}</td>
                                )}
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* Dynamic filler row to push footer down without causing overflow */}
                      <tr style={{ height: pi === chunks.length - 1 
                        ? `${Math.max(20, (isSummary ? 200 : 280) - chunk.length * 12)}px` 
                        : `${Math.max(20, 450 - chunk.length * 18)}px` 
                      }}>
                        <td colSpan={colCount}></td>
                      </tr>
                    </tbody>
                    <tfoot style={{ background: '#f9f9f9', fontWeight: 1000, borderTop: '2px solid #111', fontSize: '11px' }}>
                      <tr style={{ borderBottom: '1px solid #ddd' }}>
                        <td colSpan={isLedger || isCustSum ? 2 : (dynamicColumns ? dynamicColumns.length - 1 : (isPurchase ? 5 : 2))} style={{ padding: '5px', textAlign: 'right' }}>PAGE TOTAL:</td>
                        {isLedger || isCustSum ? (
                          <>
                            <td style={{ padding: '5px', textAlign: 'right', color: '#dc2626' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.debit || x.totalDebit || 0), 0))}</td>
                            <td style={{ padding: '5px', textAlign: 'right', color: '#059669' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.credit || x.totalCredit || 0), 0))}</td>
                            <td style={{ padding: '5px', textAlign: 'right' }}>
                              {dynamicColumns ? formatCurrency(chunk.reduce((s, x) => s + (x[dynamicColumns[dynamicColumns.length - 1].accessor] || 0), 0)) : '—'}
                            </td>
                          </>
                        ) : dynamicColumns ? (
                          <td style={{ padding: '5px', textAlign: dynamicColumns[dynamicColumns.length - 1].align || 'right' }}>
                            {dynamicColumns[dynamicColumns.length - 1].isCurrency ? formatCurrency(chunk.reduce((s, x) => s + (x[dynamicColumns[dynamicColumns.length - 1].accessor] || 0), 0)) : '—'}
                          </td>
                        ) : isPurchase ? (
                          <>
                            <td style={{ padding: '5px 2px', textAlign: 'right' }}>{chunk.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '5px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.carriage || 0), 0))}</td>
                            <td style={{ padding: '5px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                            <td style={{ padding: '5px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.totalAmount || 0), 0))}</td>
                          </>
                        ) : isSale ? (
                          <>
                            <td></td>
                            <td style={{ padding: '5px', textAlign: 'right' }}>{chunk.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '5px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                          </>
                        ) : isStock ? (
                          <>
                            <td style={{ padding: '5px', textAlign: 'right', color: '#059669' }}>+{chunk.reduce((s, x) => s + (x.qtyIn || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '5px', textAlign: 'right', color: '#dc2626' }}>-{chunk.reduce((s, x) => s + (x.qtyOut || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '5px', textAlign: 'right' }}>{chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td>
                          </>
                        ) : (
                          <td style={{ padding: '5px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                        )}
                      </tr>
                      {isLast && (
                        <tr style={{ background: '#f1f5f9' }}>
                          <td colSpan={isLedger || isCustSum ? 2 : (dynamicColumns ? dynamicColumns.length - 1 : (isPurchase ? 5 : 2))} style={{ padding: '5px', textAlign: 'right' }}>GRAND TOTAL:</td>
                          {isLedger || isCustSum ? (
                            <>
                              <td style={{ padding: '5px', textAlign: 'right', color: '#dc2626' }}>₨ {formatCurrency(totalDebit)}</td>
                              <td style={{ padding: '5px', textAlign: 'right', color: '#059669' }}>₨ {formatCurrency(totalCredit)}</td>
                              <td style={{ padding: '5px', textAlign: 'right', background: '#e2e8f0' }}>
                                {(type === 'customer' || isCustSum) ? `${formatCurrency(Math.abs(grandTotal))} ${grandTotal >= 0 ? '(Dr)' : '(Cr)'}` : `₨ ${formatCurrency(grandTotal)}`}
                              </td>
                            </>
                          ) : dynamicColumns ? (
                            <td style={{ padding: '5px', textAlign: dynamicColumns[dynamicColumns.length - 1].align || 'right', background: '#e2e8f0' }}>
                              ₨ {formatCurrency(grandTotal)}
                            </td>
                          ) : isPurchase ? (
                            <>
                              <td style={{ padding: '5px 2px', textAlign: 'right' }}>{totalQty.toLocaleString()} L</td>
                              <td style={{ padding: '5px 2px', textAlign: 'right' }}>—</td>
                              <td style={{ padding: '5px 2px', textAlign: 'right' }}>—</td>
                              <td style={{ padding: '5px 2px', textAlign: 'right', background: '#e2e8f0' }}>₨ {formatCurrency(grandTotal)}</td>
                            </>
                          ) : isSale ? (
                            <>
                              <td></td>
                              <td style={{ padding: '5px', textAlign: 'right' }}>{totalQty.toLocaleString()} L</td>
                              <td style={{ padding: '5px', textAlign: 'right', background: '#e2e8f0' }}>₨ {formatCurrency(grandTotal)}</td>
                            </>
                          ) : isStock ? (
                            <>
                              <td></td><td></td>
                              <td style={{ padding: '5px', textAlign: 'right', background: '#e2e8f0' }}>{chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td>
                            </>
                          ) : (
                            <td style={{ padding: '5px', textAlign: 'right', background: '#e2e8f0' }}>₨ {formatCurrency(grandTotal)}</td>
                          )}
                        </tr>
                      )}
                    </tfoot>
                  </table>
                )}

                {type === 'pls' && chunk[0] && (
                  <div style={{ padding: '0px' }}>
                    {/* Trading Account Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #111', marginBottom: 25 }}>
                      <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #111' }}>
                        <tr>
                          <th colSpan={4} style={{ padding: '10px 12px', borderRight: '2px solid #111', textAlign: 'left', fontSize: 13 }}>TRADING ACCOUNT — DR (PURCHASES)</th>
                          <th colSpan={4} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13 }}>TRADING ACCOUNT — CR (SALES & CLOSING)</th>
                        </tr>
                        <tr style={{ background: '#eee', fontSize: 10 }}>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'left' }}>Particulars</th>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'right' }}>Qty (L)</th>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'right' }}>Avg</th>
                          <th style={{ padding: 6, borderRight: '2px solid #111', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'left' }}>Particulars</th>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'right' }}>Qty (L)</th>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'right' }}>Avg</th>
                          <th style={{ padding: 6, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', fontSize: 11 }}>Purchases — PMG</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{chunk[0].pmg?.purchase.qty.toLocaleString()}</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{formatCurrency(chunk[0].pmg?.purchase.avg)}</td>
                          <td style={{ padding: 8, borderRight: '2px solid #111', textAlign: 'right', fontWeight: 'bold', fontSize: 11 }}>{formatCurrency(chunk[0].pmg?.purchase.amt)}</td>

                          <td style={{ padding: 8, borderRight: '1px solid #ddd', fontSize: 11 }}>Sales — PMG</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{chunk[0].pmg?.sale.qty.toLocaleString()}</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{formatCurrency(chunk[0].pmg?.sale.avg)}</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 'bold', fontSize: 11 }}>{formatCurrency(chunk[0].pmg?.sale.amt)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', fontSize: 11 }}>Purchases — HSD</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{chunk[0].hsd?.purchase.qty.toLocaleString()}</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{formatCurrency(chunk[0].hsd?.purchase.avg)}</td>
                          <td style={{ padding: 8, borderRight: '2px solid #111', textAlign: 'right', fontWeight: 'bold', fontSize: 11 }}>{formatCurrency(chunk[0].hsd?.purchase.amt)}</td>

                          <td style={{ padding: 8, borderRight: '1px solid #ddd', fontSize: 11 }}>Sales — HSD</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{chunk[0].hsd?.sale.qty.toLocaleString()}</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{formatCurrency(chunk[0].hsd?.sale.avg)}</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 'bold', fontSize: 11 }}>{formatCurrency(chunk[0].hsd?.sale.amt)}</td>
                        </tr>
                        <tr style={{ background: '#fafafa' }}>
                          <td colSpan={4} style={{ padding: 8, borderRight: '2px solid #111' }}>&nbsp;</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', fontSize: 11 }}>Closing — PMG</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{chunk[0].pmg?.stock.qty.toLocaleString()}</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{formatCurrency(chunk[0].pmg?.stock.avg)}</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 'bold', fontSize: 11 }}>{formatCurrency(chunk[0].pmg?.stock.amt)}</td>
                        </tr>
                        <tr style={{ background: '#fafafa' }}>
                          <td colSpan={4} style={{ padding: 8, borderRight: '2px solid #111' }}>&nbsp;</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', fontSize: 11 }}>Closing — HSD</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{chunk[0].hsd?.stock.qty.toLocaleString()}</td>
                          <td style={{ padding: 8, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 11 }}>{formatCurrency(chunk[0].hsd?.stock.avg)}</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 'bold', fontSize: 11 }}>{formatCurrency(chunk[0].hsd?.stock.amt)}</td>
                        </tr>
                      </tbody>
                      <tfoot style={{ background: '#eee', borderTop: '2px solid #111', fontWeight: 'bold' }}>
                        <tr>
                          <td colSpan={3} style={{ padding: 10, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 12 }}>Total Purchases (Dr):</td>
                          <td style={{ padding: 10, borderRight: '2px solid #111', textAlign: 'right', fontSize: 12 }}>₨ {formatCurrency(chunk[0].debitTotal)}</td>
                          <td colSpan={3} style={{ padding: 10, borderRight: '1px solid #ddd', textAlign: 'right', fontSize: 12 }}>Total Sales & Stock (Cr):</td>
                          <td style={{ padding: 10, textAlign: 'right', fontSize: 12 }}>₨ {formatCurrency(chunk[0].creditTotal)}</td>
                        </tr>
                        <tr style={{ background: '#fff', fontSize: 14 }}>
                          <td colSpan={4} style={{ borderRight: '2px solid #111' }}>&nbsp;</td>
                          <td colSpan={3} style={{ padding: 12, borderRight: '1px solid #ddd', textAlign: 'right' }}>GROSS PROFIT:</td>
                          <td style={{ padding: 12, textAlign: 'right', color: '#059669', borderBottom: '3px double #111' }}>₨ {formatCurrency(chunk[0].grossProfit)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Expenses Table */}
                    <div style={{ background: '#f9f9f9', border: '2px solid #111', padding: '10px 15px', marginBottom: 25 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 10, borderBottom: '1px solid #111', paddingBottom: 5 }}>OPERATING EXPENSES (SUM UP)</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #111', fontSize: 10, color: '#666' }}>
                            <th style={{ textAlign: 'left', padding: 5 }}>Expense Category</th>
                            <th style={{ textAlign: 'center', padding: 5 }}>Entries</th>
                            <th style={{ textAlign: 'right', padding: 5 }}>Amount (₨)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunk[0].detailedExpenses?.map((ex: any, ei: number) => (
                            <tr key={ei} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: 8, fontSize: 12 }}>{ex.categoryName}</td>
                              <td style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>{ex.count}</td>
                              <td style={{ padding: 8, fontSize: 12, textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(ex.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ fontWeight: 'bold', borderTop: '2px solid #111', background: '#eee' }}>
                            <td colSpan={2} style={{ padding: 10, textAlign: 'right', fontSize: 13 }}>TOTAL OPERATING EXPENSES:</td>
                            <td style={{ padding: 10, textAlign: 'right', fontSize: 13 }}>₨ {formatCurrency(chunk[0].totalExpenses)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* FINAL SUMMARY SECTION */}
                    <div style={{ marginTop: 15, border: '3px solid #111', background: '#f0f4f8', padding: '15px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: '#444', textTransform: 'uppercase' }}>Performance Summary:</span>
                          <span style={{ fontSize: 26, fontWeight: 1000, color: chunk[0].netProfit >= 0 ? '#059669' : '#dc2626' }}>
                            {chunk[0].netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 36, fontWeight: 1000, borderBottom: '4px double #111', display: 'inline-block' }}>
                            ₨ {formatCurrency(Math.abs(chunk[0].netProfit))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {type === 'balancesheet' && chunk && (
                  <div style={{ padding: '0px' }}>
                    {/* SECTION 1: CURRENT OPERATING POSITION (First Page Only) */}
                    {chunk?.isFirstPage && chunk?.pmg && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ background: '#eee', padding: '6px 10px', fontSize: 12, fontWeight: 1000, border: '2px solid #111', borderBottom: 'none' }}>
                          CURRENT OPERATING POSITION (STOCK & CUSTOMERS)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #111' }}>
                          <thead style={{ background: '#f5f5f5', borderBottom: '1px solid #111' }}>
                            <tr style={{ fontSize: 10 }}>
                              <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'left' }}>Particulars</th>
                              <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'right' }}>Qty (L)</th>
                              <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'right' }}>Avg Price</th>
                              <th style={{ padding: 6, textAlign: 'right' }}>Amount (₨)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'Stock — PMG', qty: chunk.pmg?.qty, avg: chunk.pmg?.avg, val: chunk.pmg?.val },
                              { label: 'Stock — HSD', qty: chunk.hsd?.qty, avg: chunk.hsd?.avg, val: chunk.hsd?.val },
                              { label: 'Accounts Receivable', qty: null, avg: null, val: chunk.totalReceivables },
                              { label: 'Accounts Payable (Cr)', qty: null, avg: null, val: chunk.totalPayables, isLiab: true },
                            ].map((r, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #eee', fontSize: 11, background: r.isLiab ? '#fff7ed' : '#f0f9ff' }}>
                                <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>{r.label}</td>
                                <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd', textAlign: 'right' }}>{r.qty ? r.qty.toLocaleString() : '—'}</td>
                                <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd', textAlign: 'right' }}>{r.avg ? formatCurrency(r.avg) : '—'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: r.isLiab ? '#dc2626' : '#1d4ed8' }}>
                                  {r.isLiab ? `(Cr) ` : ''}₨ {formatCurrency(r.val || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot style={{ borderTop: '2px solid #111', background: '#f5f5f5', fontWeight: 1000 }}>
                            <tr style={{ fontSize: 11 }}>
                              <td colSpan={3} style={{ padding: '8px 10px', borderRight: '1px solid #ddd' }}>TOTAL OPERATING POSITION (NET)</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                ₨ {formatCurrency(((chunk.pmg?.val || 0) + (chunk.hsd?.val || 0) + (chunk.totalReceivables || 0)) - (chunk.totalPayables || 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* SECTION 2: ASSETS vs LIABILITIES */}
                    <div style={{ background: '#eee', padding: '6px 10px', fontSize: 12, fontWeight: 1000, border: '2px solid #111', borderBottom: 'none' }}>
                      NON-CURRENT ASSETS & CAPITAL
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #111', marginBottom: 25 }}>
                      <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #111' }}>
                        <tr style={{ background: '#eee', fontSize: 10 }}>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'left' }}>Fixed Asset Name</th>
                          <th style={{ padding: 6, borderRight: '2px solid #111', textAlign: 'right' }}>Amount (₨)</th>
                          <th style={{ padding: 6, borderRight: '1px solid #ddd', textAlign: 'left' }}>Capital & Other Liab.</th>
                          <th style={{ padding: 6, textAlign: 'right' }}>Amount (₨)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const d = chunk;
                          const leftRows = (d.allAssets || []).map((a: any) => ({ label: a.name, val: a.bal }));
                          const rightRows = [
                            ...(d.liabilities || []).map((l: any) => ({ label: l.name, val: l.bal })),
                            ...(d.capital || []).map((c: any) => ({ label: c.name, val: c.bal })),
                          ];
                          
                          const visibleLeft = leftRows.slice(d.rowStart, d.rowEnd);
                          const visibleRight = rightRows.slice(d.rowStart, d.rowEnd);
                          const pageRows = Math.max(visibleLeft.length, visibleRight.length);
                          
                          return Array.from({ length: pageRows }).map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee', fontSize: 11 }}>
                              <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd' }}>{visibleLeft[i]?.label || ''}</td>
                              <td style={{ padding: '8px 10px', borderRight: '2px solid #111', textAlign: 'right' }}>{visibleLeft[i] ? formatCurrency(visibleLeft[i].val) : ''}</td>
                              <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd' }}>{visibleRight[i]?.label || ''}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{visibleRight[i] ? formatCurrency(visibleRight[i].val) : ''}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                      {isLast && (
                        <tfoot style={{ borderTop: '2px solid #111', background: '#f5f5f5', fontWeight: 1000 }}>
                          <tr style={{ fontSize: 11 }}>
                            <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd' }}>SUB-TOTAL</td>
                            <td style={{ padding: '8px 10px', borderRight: '2px solid #111', textAlign: 'right' }}>₨ {formatCurrency(chunk.totalAssets)}</td>
                            <td style={{ padding: '8px 10px', borderRight: '1px solid #ddd' }}>SUB-TOTAL</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>₨ {formatCurrency(chunk.totalEquity)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                <div style={{ flex: 1 }}></div>

                {isLast && (
                      <div style={{ marginTop: '10px', breakInside: 'avoid', pageBreakInside: 'avoid', display: 'block' }}>
                        <div style={{ marginTop: '5px' }}>
                          {type === 'balancesheet' && (
                            <div style={{ border: '2px solid #000', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f9f9f9', overflow: 'hidden', marginBottom: '8px' }}>
                              <div style={{ padding: '6px 12px', borderRight: '2px solid #000' }}>
                                <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#444' }}>Report Summary</div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#000' }}>Financial Statement Records</div>
                              </div>
                              <div style={{ padding: '6px 12px', background: '#fff' }}>
                                <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase', color: '#444' }}>Grand Total (Assets)</div>
                                <div style={{ fontSize: '18px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block', lineHeight: 1.2, color: '#000' }}>
                                  ₨ {formatCurrency(chunk.totalAssets)}
                                </div>
                              </div>
                            </div>
                          )}

                          {type !== 'pls' && type !== 'balancesheet' && (
                            <>
                              <div style={{ border: '2px solid #000', display: 'grid', gridTemplateColumns: `repeat(${(isSale || isPurchase || isLedger || isSummary) ? 3 : 2}, minmax(0, 1fr))`, background: '#f8f8f8', overflow: 'hidden' }}>
                                {(isSale || isPurchase) ? (
                                  <>
                                    <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Page Total</div>
                                      <div style={{ fontSize: '18px', fontWeight: 900 }}>₨ {formatCurrency(total)}</div>
                                    </div>
                                    <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Grand Total</div>
                                      <div style={{ fontSize: '18px', fontWeight: 900 }}>₨ {formatCurrency(grandTotal)}</div>
                                    </div>
                                    <div style={{ padding: '10px 15px', background: '#fff' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Volume</div>
                                      <div style={{ fontSize: '18px', fontWeight: 900 }}>{totalQty.toLocaleString()} L</div>
                                    </div>
                                  </>
                                ) : (isLedger || isSummary) ? (
                                  <>
                                    <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Debit</div>
                                      <div style={{ fontSize: '16px', fontWeight: 900 }}>₨ {formatCurrency(totalDebit)}</div>
                                    </div>
                                    <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Credit</div>
                                      <div style={{ fontSize: '16px', fontWeight: 900 }}>₨ {formatCurrency(totalCredit)}</div>
                                    </div>
                                    <div style={{ padding: '10px 15px', background: '#fff' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase' }}>Grand Total</div>
                                      <div style={{ fontSize: '22px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block', lineHeight: 1 }}>
                                        ₨ {formatCurrency(Math.abs(grandTotal))} {(type === 'customer' || isSummary) ? (grandTotal >= 0 ? '(Dr)' : '(Cr)') : ''}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Count</div>
                                      <div style={{ fontSize: '18px', fontWeight: 900 }}>{data.length} Records</div>
                                    </div>
                                    <div style={{ padding: '10px 15px', background: '#fff' }}>
                                      <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase' }}>Grand Total</div>
                                      <div style={{ fontSize: '22px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block', lineHeight: 1 }}>
                                        ₨ {formatCurrency(Math.abs(grandTotal))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              {!isStock && (
                                <div style={{ padding: '8px 12px', fontStyle: 'italic', fontSize: '11px', fontWeight: 1000, border: '2px solid #111', borderTop: 'none' }}>
                                  Amount in words: <span style={{ textTransform: 'uppercase' }}>{toWords(grandTotal)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8 }}>
                          <div style={{ fontSize: '9px', fontWeight: 900, fontStyle: 'italic', color: '#000', textAlign: 'left', textTransform: 'uppercase', lineHeight: 1.2 }}>
                            This is a computer generated bill.<br />Errors and omissions are accepted.
                          </div>
                          <div style={{ textAlign: 'center', width: '250px' }}>
                            <div style={{ width: '100%', height: '40px', borderBottom: '2px solid #000', marginBottom: 4, position: 'relative' }}>
                              <img src="/assets/imtiaz-sign.png" style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', height: '60px', objectFit: 'contain' }} />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 1000, textTransform: 'uppercase', color: '#000' }}>Muhammad Imtiaz ul Hassan</div>
                            <div style={{ fontSize: '8px', fontWeight: 800, color: '#333' }}>(Chief Executive Officer)</div>
                          </div>
                        </div>
                        <div style={{ marginTop: '5px', textAlign: 'center', fontSize: '9px', color: '#000', fontStyle: 'italic', fontWeight: 1000 }}>
                          Software Solution by Mb Soft and Tech — 0304-1654629
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
}
