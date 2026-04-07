import React, { useEffect, useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Props {
  data: any[];
  type: 'sale' | 'purchase';
  onClose: () => void;
}

const ROWS_PER_PAGE = 24;

// ── Bill number ──────────────────────────────────────────────────────────────
function makeBillNo(type: 'sale' | 'purchase') {
  const p = type === 'sale' ? 'SB' : 'PB';
  const y = new Date().getFullYear().toString().slice(-2);
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `${p}-${y}-${n}`;
}

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

// ── Build the full HTML document for printing ────────────────────────────────
function buildPrintHTML(
  data: any[],
  type: 'sale' | 'purchase',
  billNo: string,
  dateRange: string,
): string {
  const isPurchase = type === 'purchase';
  const title = isPurchase ? 'PURCHASE BILL / REGISTER' : 'SALES BILL / REGISTER';

  const chunks: any[][] = [];
  for (let i = 0; i < data.length; i += ROWS_PER_PAGE) chunks.push(data.slice(i, i + ROWS_PER_PAGE));
  if (chunks.length === 0) chunks.push([]);

  const grand = {
    qty:      data.reduce((s, x) => s + (x.quantity || 0), 0),
    amount:   data.reduce((s, x) => s + (x.amount || 0), 0),
    carriage: data.reduce((s, x) => s + (x.carriage || 0), 0),
    total:    data.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0),
  };

  const today = formatDate(new Date().toISOString().split('T')[0]);

  const pageHtml = chunks.map((chunk, pi) => {
    const isLast = pi === chunks.length - 1;
    const pageTotals = {
      qty:      chunk.reduce((s, x) => s + (x.quantity || 0), 0),
      amount:   chunk.reduce((s, x) => s + (x.amount || 0), 0),
      carriage: chunk.reduce((s, x) => s + (x.carriage || 0), 0),
      total:    chunk.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0),
    };

    const rows = chunk.length === 0
      ? `<tr><td colspan="${isPurchase ? 8 : 5}" style="text-align:center;padding:32px;color:#888;font-style:italic;">No records for this period</td></tr>`
      : chunk.map((row, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9f9f9'}">
          <td style="text-align:center">${pi * ROWS_PER_PAGE + idx + 1}</td>
          <td style="white-space:nowrap">${formatDate(row.date)}</td>
          ${isPurchase ? `<td>${row.details || '—'}</td>` : `<td style="text-transform:uppercase">${row.type || 'N/A'}</td>`}
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(row.rate)}</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700">${(row.quantity || 0).toLocaleString()}</td>
          ${isPurchase ? `<td style="text-align:right;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(row.carriage)}</td>` : ''}
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(row.amount)}</td>
          ${isPurchase ? `<td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:800;white-space:nowrap">₨ ${formatCurrency(row.totalAmount)}</td>` : ''}
        </tr>`).join('');

    const grandBlock = isLast ? `
      <div style="margin-top:16px;border:1.5px solid #333;padding:0;font-family:'Times New Roman',serif">
        <div style="border-bottom:1.5px solid #333;padding:6px 12px;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.6px;display:flex;justify-content:space-between">
          <span>Grand Total — All Pages</span>
          <span>Total Records: ${data.length}</span>
        </div>
        <div style="display:grid;grid-template-columns:${isPurchase ? '1fr 1fr 1fr 1fr' : '1fr 1fr'};border-bottom:1px solid #ddd">
          <div style="padding:8px 12px;border-right:1px solid #ddd">
            <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:2px">Total Quantity</div>
            <div style="font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace">${grand.qty.toLocaleString()} L</div>
          </div>
          ${isPurchase ? `
          <div style="padding:8px 12px;border-right:1px solid #ddd">
            <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:2px">Total Carriage</div>
            <div style="font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(grand.carriage)}</div>
          </div>
          <div style="padding:8px 12px;border-right:1px solid #ddd">
            <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:2px">Net Amount</div>
            <div style="font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(grand.amount)}</div>
          </div>` : ''}
          <div style="padding:8px 12px;">
            <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:2px">${isPurchase ? 'Grand Total (incl. Carriage)' : 'Total Amount'}</div>
            <div style="font-size:16px;font-weight:900;font-family:'JetBrains Mono',monospace;border-bottom:2px solid #333;display:inline-block;padding-bottom:1px;white-space:nowrap">₨ ${formatCurrency(grand.total)}</div>
          </div>
        </div>
        <div style="padding:5px 12px;font-style:italic;font-size:9px;font-weight:700;color:#444;border-bottom:1px solid #eee">
          Amount in Words: ${toWords(grand.total)}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:24px;margin-top:auto;font-family:'Times New Roman',serif">
        <div style="font-size:8.5px;font-weight:600;color:#555;line-height:1.8">
          &#10003; This is a computer-generated bill.<br/>
          &#10003; Errors and omissions are excepted (E&amp;OE).<br/>
          &#10003; Subject to District Jhang jurisdiction.
        </div>
        <div>
          <div style="width:210px;border-top:1.5px solid #333;padding-top:6px">
            <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px">Muhammad Hammad Rahim</div>
            <div style="font-size:8.5px;font-weight:700;color:#555;text-transform:uppercase">Proprietor / Authorized Signatory</div>
            <div style="font-size:8px;color:#666">Hammad Rahim Filling Station</div>
          </div>
        </div>
      </div>` : `
      <div style="margin-top:10px;border-top:1px dashed #aaa;padding-top:5px;text-align:center;font-size:8.5px;color:#888;font-style:italic;font-family:'Times New Roman',serif">
        — Continued on Page ${pi + 2} —
      </div>`;

    return `
    <div class="page">
      <!-- Letterhead (Times New Roman) -->
      <div style="border:3px double #333;padding:2px;margin-bottom:10px;font-family:'Times New Roman',serif">
        <div style="border:1px solid #333;padding:8px 10px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div style="width:72px;height:72px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
              <img src="/assets/logo-hr.png" alt="HR" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.style.display='none'" />
            </div>
            <div style="text-align:center;flex:1;min-width:0">
              <div style="font-size:22px;font-weight:900;text-transform:uppercase;text-decoration:underline;text-underline-offset:4px;white-space:nowrap;letter-spacing:0.5px;line-height:1.1;margin-bottom:3px">
                Hammad Rahim Filling Station
              </div>
              <div style="font-size:9.5px;font-weight:700;font-style:italic;text-transform:uppercase;color:#444;margin-bottom:5px;letter-spacing:0.4px">
                Muzafar Garh Road, Ada Ghyl Pur, District Jhang
              </div>
              <div style="display:flex;justify-content:center;gap:18px;font-size:9px;font-weight:700;color:#333">
                <span>&#128241; WhatsApp: +92-301-7221831</span>
                <span>&#128222; Phone: +92-300-0989192</span>
                <span>&#9993; hammadrahimfs@gmail.com</span>
              </div>
            </div>
            <div style="width:72px;height:72px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
              <img src="/assets/logo-go.png" alt="GO" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.style.display='none'" />
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;border:1px solid #333;padding:5px 10px;margin-bottom:10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">
        <span>${title} &nbsp;|&nbsp; Bill No: ${billNo}</span>
        <span>Period: ${dateRange}</span>
        <span>Printed: ${today} &nbsp;|&nbsp; Page ${pi + 1} of ${chunks.length}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:28px;text-align:center">No.</th>
            <th style="width:64px;white-space:nowrap">Date</th>
            <th>${isPurchase ? 'Supplier / Details' : 'Product'}</th>
            <th style="width:70px;text-align:right;white-space:nowrap">Rate (₨)</th>
            <th style="width:64px;text-align:right">Qty (L)</th>
            ${isPurchase ? '<th style="width:68px;text-align:right;white-space:nowrap">Carriage</th>' : ''}
            <th style="width:74px;text-align:right;white-space:nowrap">${isPurchase ? 'Net Amt' : 'Amount'}</th>
            ${isPurchase ? '<th style="width:78px;text-align:right;white-space:nowrap">Total Amt</th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="${isPurchase ? 4 : 3}" style="text-align:right;font-weight:800;font-size:9px;text-transform:uppercase;letter-spacing:0.4px;color:#555">
              Page ${pi + 1} Sub-Total:
            </td>
            <td style="text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace">${pageTotals.qty.toLocaleString()}</td>
            ${isPurchase ? `<td style="text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(pageTotals.carriage)}</td>` : ''}
            <td style="text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(pageTotals.amount)}</td>
            ${isPurchase ? `<td style="text-align:right;font-weight:900;font-family:'JetBrains Mono',monospace;white-space:nowrap">₨ ${formatCurrency(pageTotals.total)}</td>` : ''}
          </tr>
        </tfoot>
      </table>

      ${grandBlock}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${title} — ${billNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Outfit', 'Segoe UI', Arial, sans-serif;
  font-size: 10.5px;
  color: #111;
  background: #fff;
}
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 13mm 10mm;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  background: #fff;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
thead tr {
  border-top: 1.5px solid #333;
  border-bottom: 1.5px solid #333;
  background: #f2f2f2;
}
thead th {
  padding: 5px 6px;
  font-weight: 800;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-right: 1px solid #ccc;
  text-align: left;
}
thead th:last-child { border-right: none; }
tbody td {
  padding: 4px 6px;
  border-bottom: 1px solid #e5e5e5;
  border-right: 1px solid #e5e5e5;
}
tbody td:last-child { border-right: none; }
tfoot tr {
  border-top: 1.5px solid #333;
  background: #f7f7f7;
}
tfoot td {
  padding: 5px 6px;
  border-right: 1px solid #ccc;
  font-size: 10px;
}
tfoot td:last-child { border-right: none; }
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 portrait; margin: 0; }
  body { background: #fff !important; }
  .page { margin: 0 !important; box-shadow: none !important; }
}
</style>
</head>
<body>${pageHtml}</body>
</html>`;
}

export default function PrintReportModal({ data, type, onClose }: Props) {
  const [billNo] = useState(() => makeBillNo(type));

  const isPurchase = type === 'purchase';
  const title = isPurchase ? 'PURCHASE BILL / REGISTER' : 'SALES BILL / REGISTER';

  const dates = data.map(x => x.date).sort();
  const dateRange = dates.length
    ? `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`
    : 'N/A';

  const handlePrint = () => {
    const html = buildPrintHTML(data, type, billNo, dateRange);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow popups to print the bill.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 1200);
  };

  const chunks: any[][] = [];
  for (let i = 0; i < data.length; i += ROWS_PER_PAGE) chunks.push(data.slice(i, i + ROWS_PER_PAGE));
  if (chunks.length === 0) chunks.push([]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', paddingBottom: 40,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, width: '100%', maxWidth: '860px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'rgba(15,23,42,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText style={{ width: 17, height: 17, color: '#60a5fa' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            <Printer style={{ width: 15, height: 15 }} /> Print / Save PDF
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {chunks.map((chunk, pi) => {
        const isLast = pi === chunks.length - 1;
        const pageTotals = {
          qty:      chunk.reduce((s, x) => s + (x.quantity || 0), 0),
          amount:   chunk.reduce((s, x) => s + (x.amount || 0), 0),
          carriage: chunk.reduce((s, x) => s + (x.carriage || 0), 0),
          total:    chunk.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0),
        };
        const grand = {
          qty:      data.reduce((s, x) => s + (x.quantity || 0), 0),
          total:    data.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0),
          carriage: data.reduce((s, x) => s + (x.carriage || 0), 0),
          amount:   data.reduce((s, x) => s + (x.amount || 0), 0),
        };

        return (
          <div key={pi} style={{ width: '210mm', minHeight: '297mm', background: '#fff', color: '#111', padding: '12mm 13mm 10mm', margin: '24px auto 0', boxShadow: '0 4px 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ border: '3px double #333', padding: '2px', marginBottom: '10px', fontFamily: "'Times New Roman',serif" }}>
              <div style={{ border: '1px solid #333', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ width: 72, height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/assets/logo-hr.png" alt="HR" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '21px', fontWeight: 900, textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: '4px', whiteSpace: 'nowrap' }}>Hammad Rahim Filling Station</div>
                    <div style={{ fontSize: '9.5px', fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', color: '#444', marginTop: 3 }}>Muzafar Garh Road, Ada Ghyl Pur, District Jhang</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '9px', fontWeight: 700, marginTop: 5 }}>
                      <span>📱 WhatsApp: +92-301-7221831</span>
                      <span>📞 Phone: +92-300-0989192</span>
                    </div>
                  </div>
                  <div style={{ width: 72, height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/assets/logo-go.png" alt="GO" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #333', padding: '5px 10px', marginBottom: '10px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>{title} &nbsp;|&nbsp; Bill No: {billNo}</span>
              <span>Period: {dateRange}</span>
              <span>Page {pi + 1} of {chunks.length}</span>
            </div>

            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ borderTop: '1.5px solid #333', borderBottom: '1.5px solid #333', background: '#f2f2f2' }}>
                    <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'center', borderRight: '1px solid #ccc', width: 28 }}>No.</th>
                    <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'left', borderRight: '1px solid #ccc', width: 64, whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'left', borderRight: '1px solid #ccc' }}>{isPurchase ? 'Supplier' : 'Product'}</th>
                    <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', width: 70, whiteSpace: 'nowrap' }}>Rate (₨)</th>
                    <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', width: 64 }}>Qty (L)</th>
                    {isPurchase && <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', width: 68, whiteSpace: 'nowrap' }}>Carriage</th>}
                    <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', width: 74, whiteSpace: 'nowrap' }}>Amount (₨)</th>
                    {isPurchase && <th style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', width: 78, whiteSpace: 'nowrap' }}>Total (₨)</th>}
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'center', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>{pi * ROWS_PER_PAGE + idx + 1}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', whiteSpace: 'nowrap' }}>{formatDate(row.date)}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', textTransform: isPurchase ? 'none' : 'uppercase' }}>{isPurchase ? (row.details || '—') : (row.type || 'N/A')}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.rate)}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', fontWeight: 700 }}>{(row.quantity || 0).toLocaleString()}</td>
                      {isPurchase && <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.carriage)}</td>}
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.amount)}</td>
                      {isPurchase && <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.totalAmount)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isLast && (
              <div style={{ marginTop: 'auto', paddingTop: '14px', fontFamily: "'Times New Roman',serif" }}>
                <div style={{ border: '1.5px solid #333', display: 'grid', gridTemplateColumns: isPurchase ? '1fr 1fr 1fr 1fr' : '1fr 1fr' }}>
                   <div style={{ padding: '8px 12px', borderRight: '1px solid #333' }}>
                      <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Total Quantity</div>
                      <div style={{ fontSize: '14px', fontWeight: 800 }}>{grand.qty.toLocaleString()} L</div>
                   </div>
                   {isPurchase && <>
                     <div style={{ padding: '8px 12px', borderRight: '1px solid #333' }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Carriage</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>₨ {formatCurrency(grand.carriage)}</div>
                     </div>
                     <div style={{ padding: '8px 12px', borderRight: '1px solid #333' }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Amount</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>₨ {formatCurrency(grand.amount)}</div>
                     </div>
                   </>}
                   <div style={{ padding: '8px 12px' }}>
                      <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#666' }}>Grand Total</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(grand.total)}</div>
                   </div>
                </div>
                <div style={{ padding: '6px 10px', fontStyle: 'italic', fontSize: '9px', fontWeight: 700, border: '1.5px solid #333', borderTop: 'none', background: '#fafafa' }}>
                   Amount In Words: {toWords(grand.total)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 25 }}>
                   <div style={{ fontSize: '8.5px', color: '#555' }}>✓ Computer Generated Bill. E&OE Accepted.</div>
                   <div style={{ width: 210, borderTop: '1.5px solid #333', paddingTop: 6 }}>
                      <div style={{ fontSize: '11px', fontWeight: 900 }}>Muhammad Hammad Rahim</div>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase' }}>Proprietor / Authorized Signatory</div>
                   </div>
                </div>
              </div>
            )}
            {!isLast && (
              <div style={{ marginTop: 10, borderTop: '1px dashed #aaa', paddingTop: 5, textAlign: 'center', fontSize: '8.5px', color: '#888', fontStyle: 'italic', fontFamily: "'Times New Roman',serif" }}>
                — Continued on Page {pi + 2} —
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
