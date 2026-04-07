import { X, Printer, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Props {
  data: any[];
  type: 'sale' | 'purchase';
  onClose: () => void;
}

const ROWS_PER_PAGE = 24;


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


  const pageHtml = chunks.map((chunk, pi) => {
    const isLast = pi === chunks.length - 1;
    const rows = chunk.length === 0
      ? `<tr><td colspan="${isPurchase ? 8 : 5}" style="text-align:center;padding:32px;color:#888;font-style:italic;">No records for this period</td></tr>`
      : chunk.map((row, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9f9f9'}">
          <td style="text-align:center">${pi * ROWS_PER_PAGE + idx + 1}</td>
          <td style="white-space:nowrap">${formatDate(row.date)}</td>
          ${isPurchase ? `<td>${row.details || '—'}</td>` : `<td style="text-transform:uppercase">${row.type || 'N/A'}</td>`}
          <td style="text-align:right;white-space:nowrap">₨ ${formatCurrency(row.rate)}</td>
          <td style="text-align:right;font-weight:700">${(row.quantity || 0).toLocaleString()}</td>
          ${isPurchase ? `<td style="text-align:right;white-space:nowrap">₨ ${formatCurrency(row.carriage)}</td>` : ''}
          <td style="text-align:right;white-space:nowrap">₨ ${formatCurrency(row.amount)}</td>
          ${isPurchase ? `<td style="text-align:right;font-weight:800;white-space:nowrap">₨ ${formatCurrency(row.totalAmount)}</td>` : ''}
        </tr>`).join('');

    const grandBlock = isLast ? `
      <div style="margin-top:auto; padding-top:5px;">
        <div style="border:1.5px solid #111;padding:0;background:#fff">
          <div style="border-bottom:1.5px solid #111;padding:6px 10px;font-weight:900;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;display:flex;justify-content:space-between;background:#f5f5f5">
            <span>Final Total Accumulation (All Pages)</span>
            <span>Record Count: ${data.length}</span>
          </div>
          <div style="display:grid;grid-template-columns:${isPurchase ? '1fr 1fr 1fr 1fr' : '1fr 1fr'};border-bottom:1.5px solid #333">
            <div style="padding:8px 12px;border-right:1.5px solid #333">
              <div style="font-size:8.5px;font-weight:900;text-transform:uppercase;color:#444;margin-bottom:2px">Total Quantity</div>
              <div style="font-size:14px;font-weight:900">${grand.qty.toLocaleString()} L</div>
            </div>
            ${isPurchase ? `
            <div style="padding:8px 12px;border-right:1.5px solid #333">
              <div style="font-size:8.5px;font-weight:900;text-transform:uppercase;color:#444;margin-bottom:2px">Total Carriage</div>
              <div style="font-size:14px;font-weight:900;white-space:nowrap">₨ ${formatCurrency(grand.carriage)}</div>
            </div>
            <div style="padding:8px 12px;border-right:1.5px solid #333">
              <div style="font-size:8.5px;font-weight:900;text-transform:uppercase;color:#444;margin-bottom:2px">Net Amount</div>
              <div style="font-size:14px;font-weight:900;white-space:nowrap">₨ ${formatCurrency(grand.amount)}</div>
            </div>` : ''}
            <div style="padding:8px 12px;background:#f9f9f9">
              <div style="font-size:8.5px;font-weight:950;text-transform:uppercase;color:#111;margin-bottom:2px">Grand Total</div>
              <div style="font-size:16px;font-weight:1000;border-bottom:2.5px solid #111;display:inline-block;padding-bottom:1px;white-space:nowrap">₨ ${formatCurrency(grand.total)}</div>
            </div>
          </div>
          <div style="padding:6px 10px;font-style:italic;font-size:9.5px;font-weight:900;color:#000;background:#fff">
            Amount in Words: ${toWords(grand.total)}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:20px">
          <div style="text-align:left;font-size:9.5px;font-weight:800;color:#333;font-style:italic;white-space:nowrap;padding-bottom:5px">
            * This is a computerized generated bill. Errors and omissions are accepted (E&OE).
          </div>
          <div style="text-align:right">
            <div style="height:60px;display:flex;align-items:flex-end;justify-content:flex-end;margin-bottom:3px">
              <img src="/assets/imtiaz-sign.png" alt="" style="max-height:100%;max-width:160px;object-fit:contain" onerror="this.style.visibility='hidden'" />
            </div>
            <div style="width:200px;border-top:2px solid #111;padding-top:8px;display:inline-block;text-align:right">
              <div style="font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap">Muhammad Imtiaz ul Hassan</div>
              <div style="font-size:9px;font-weight:800;color:#222;text-transform:uppercase;margin-top:2px;white-space:nowrap">CEO Hammad Rahim Filling station</div>
            </div>
          </div>
        </div>
      </div>` : `
      <div style="margin-top:10px;border-top:1px dashed #aaa;padding-top:5px;text-align:center;font-size:8.5px;color:#888;font-style:italic;">
        — Document Continues on Next Page —
      </div>`;

    return `
    <div class="page">
      <div style="border:3.5px double #111;padding:2px;margin-bottom:10px;">
        <div style="border:1px solid #111;padding:8px 10px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div style="width:75px;height:75px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
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
              </div>
            </div>
            <div style="width:75px;height:75px;flex-shrink:0;display:flex;align-items:center;justify-content:center">
              <img src="/assets/logo-go.png" alt="GO" style="max-width:100%;max-height:100%;object-fit:contain" onerror="this.style.display='none'" />
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;border:1.5px solid #111;padding:6px 12px;margin-bottom:10px;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;background:#f9f9f9">
        <span>${title}</span>
        <span>Date Range: ${dateRange}</span>
        <span>Page No. ${pi + 1} / ${chunks.length}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">Sr.</th>
            <th style="width:70px;white-space:nowrap">Date</th>
            <th>${isPurchase ? 'Source / Supplier Info' : 'Product Category'}</th>
            <th style="width:75px;text-align:right;white-space:nowrap">Rate (₨)</th>
            <th style="width:70px;text-align:right">Qty (L)</th>
            ${isPurchase ? '<th style="width:75px;text-align:right;white-space:nowrap">Carriage</th>' : ''}
            <th style="width:85px;text-align:right;white-space:nowrap">${isPurchase ? 'Net Amt' : 'Amount'}</th>
            ${isPurchase ? '<th style="width:90px;text-align:right;white-space:nowrap">Total Amt</th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="${isPurchase ? 4 : 3}" style="text-align:right;font-weight:900;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#111">
              Page Sub-Total Accumulation:
            </td>
            <td style="text-align:right;font-weight:900;">${((chunk.reduce((s, x) => s + (x.quantity || 0), 0) || 0)).toLocaleString()}</td>
            ${isPurchase ? `<td style="text-align:right;font-weight:900;white-space:nowrap">₨ ${formatCurrency(chunk.reduce((s, x) => s + (x.carriage || 0), 0))}</td>` : ''}
            <td style="text-align:right;font-weight:900;white-space:nowrap">₨ ${formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
            ${isPurchase ? `<td style="text-align:right;font-weight:950;white-space:nowrap">₨ ${formatCurrency(chunk.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0))}</td>` : ''}
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
<title>${title} — ${dateRange}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 10.5px;
  color: #000;
  background: #fff;
}
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 10mm 13mm 10mm;
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
  border-top: 1.5px solid #111;
  border-bottom: 1.5px solid #111;
  background: #eee;
}
thead th {
  padding: 5px 6px;
  font-weight: 900;
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-right: 1px solid #ccc;
  text-align: left;
}
thead th:last-child { border-right: none; }
tbody td {
  padding: 4px 6px;
  border-bottom: 1px solid #ddd;
  border-right: 1px solid #ddd;
}
tbody td:last-child { border-right: none; }
tfoot tr {
  border-top: 1.5px solid #111;
  background: #fafafa;
}
tfoot td {
  padding: 5px 6px;
  border-right: 1px solid #ccc;
}
tfoot td:last-child { border-right: none; }
@media print {
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

  const isPurchase = type === 'purchase';
  const title = isPurchase ? 'PURCHASE BILL / REGISTER' : 'SALES BILL / REGISTER';

  const dates = data.map(x => x.date).sort();
  const dateRange = dates.length
    ? `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`
    : 'N/A';

  const handlePrint = () => {
    const html = buildPrintHTML(data, type, dateRange);
    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) { alert('Please allow popups to print the bill.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); setTimeout(() => win.print(), 350); };
  };

  const chunks: any[][] = [];
  for (let i = 0; i < data.length; i += ROWS_PER_PAGE) chunks.push(data.slice(i, i + ROWS_PER_PAGE));
  if (chunks.length === 0) chunks.push([]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Times New Roman', serif",
      overflowY: 'auto', paddingBottom: 60,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, width: '100%', maxWidth: '900px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'rgba(15,23,42,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(15px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText style={{ width: 18, height: 18, color: '#60a5fa' }} />
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title} Preview</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            <Printer style={{ width: 16, height: 16 }} /> Print / Save PDF
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      {chunks.map((chunk, pi) => {
        const isLast = pi === chunks.length - 1;
        const grand = {
          qty:      data.reduce((s, x) => s + (x.quantity || 0), 0),
          total:    data.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0),
          carriage: data.reduce((s, x) => s + (x.carriage || 0), 0),
          amount:   data.reduce((s, x) => s + (x.amount || 0), 0),
        };

        return (
          <div key={pi} style={{ width: '210mm', minHeight: '297mm', background: '#fff', color: '#000', padding: '10mm 13mm 10mm', margin: '30px auto 0', boxShadow: '0 10px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ border: '3.5px double #111', padding: '2px', marginBottom: '10px' }}>
              <div style={{ border: '1px solid #111', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ width: 75, height: 75, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/assets/logo-hr.png" alt="HR" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: '4px', whiteSpace: 'nowrap' }}>Hammad Rahim Filling Station</div>
                    <div style={{ fontSize: '9.5px', fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', color: '#444', marginTop: 3 }}>Muzafar Garh Road, Ada Ghyl Pur, District Jhang</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', fontSize: '9px', fontWeight: 900, marginTop: 5 }}>
                      <span>📱 WhatsApp: +92-301-7221831</span>
                      <span>📞 Phone: +92-300-0989192</span>
                    </div>
                  </div>
                  <div style={{ width: 75, height: 75, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/assets/logo-go.png" alt="GO" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', border: '1.5px solid #111', padding: '6px 12px', marginBottom: '10px', fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', background: '#f9f9f9' }}>
              <span>{title}</span>
              <span>Date Range: {dateRange}</span>
              <span style={{ fontSize: '9px' }}>Page No. {pi + 1} / {chunks.length}</span>
            </div>

            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ borderTop: '1.5px solid #111', borderBottom: '1.5px solid #111', background: '#eee' }}>
                    <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'center', borderRight: '1px solid #ccc', width: 30 }}>Sr.</th>
                    <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'left', borderRight: '1px solid #ccc', width: 70, whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'left', borderRight: '1px solid #ccc' }}>{isPurchase ? 'Supplier info' : 'Product'}</th>
                    <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'right', borderRight: '1px solid #ccc', width: 75, whiteSpace: 'nowrap' }}>Rate (₨)</th>
                    <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'right', borderRight: '1px solid #ccc', width: 70 }}>Qty (L)</th>
                    {isPurchase && <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'right', borderRight: '1px solid #ccc', width: 75, whiteSpace: 'nowrap' }}>Carriage</th>}
                    <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'right', borderRight: '1px solid #ccc', width: 85, whiteSpace: 'nowrap' }}>Amount (₨)</th>
                    {isPurchase && <th style={{ padding: '5px 6px', fontSize: '9.5px', textAlign: 'right', width: 90, whiteSpace: 'nowrap' }}>Total (₨)</th>}
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd' }}>{pi * ROWS_PER_PAGE + idx + 1}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', whiteSpace: 'nowrap' }}>{formatDate(row.date)}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'left', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd' }}>{isPurchase ? (row.details || '—') : (row.type || 'N/A')}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.rate)}</td>
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', fontWeight: 800 }}>{(row.quantity || 0).toLocaleString()}</td>
                      {isPurchase && <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.carriage)}</td>}
                      <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd', whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.amount)}</td>
                      {isPurchase && <td style={{ padding: '4px 6px', fontSize: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', fontWeight: 1000, whiteSpace: 'nowrap' }}>₨ {formatCurrency(row.totalAmount)}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={isPurchase ? 4 : 3} style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', fontWeight: 900 }}>Page Sub-Total Accumulation:</td>
                    <td style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', fontWeight: 900 }}>{(chunk.reduce((s, x) => s + (x.quantity || 0), 0) || 0).toLocaleString()}</td>
                    {isPurchase && <td style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.carriage || 0), 0))}</td>}
                    <td style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', borderRight: '1px solid #ccc', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                    {isPurchase && <td style={{ padding: '5px 6px', fontSize: '9px', textAlign: 'right', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0))}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>

            {isLast && (
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <div style={{ border: '1.5px solid #111', display: 'grid', gridTemplateColumns: isPurchase ? '1fr 1fr 1fr 1fr' : '1fr 1fr', background: '#fff' }}>
                   <div style={{ padding: '8px 12px', borderRight: '1.5px solid #111' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#444' }}>Total Quantity</div>
                      <div style={{ fontSize: '14px', fontWeight: 900 }}>{grand.qty.toLocaleString()} L</div>
                   </div>
                   {isPurchase && <>
                     <div style={{ padding: '8px 12px', borderRight: '1.5px solid #111' }}>
                        <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#444' }}>Carriage Fee</div>
                        <div style={{ fontSize: '14px', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(grand.carriage)}</div>
                     </div>
                     <div style={{ padding: '8px 12px', borderRight: '1.5px solid #111' }}>
                        <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', color: '#444' }}>Net Amount</div>
                        <div style={{ fontSize: '14px', fontWeight: 900, whiteSpace: 'nowrap' }}>₨ {formatCurrency(grand.amount)}</div>
                     </div>
                   </>}
                   <div style={{ padding: '8px 12px', background: '#f5f5f5' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 950, textTransform: 'uppercase', color: '#000' }}>Grand Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 1000, whiteSpace: 'nowrap', borderBottom: '2.5px solid #000', display: 'inline-block' }}>₨ {formatCurrency(grand.total)}</div>
                   </div>
                </div>
                <div style={{ padding: '6px 10px', fontStyle: 'italic', fontSize: '9.5px', fontWeight: 900, border: '1.5px solid #111', borderTop: 'none', background: '#fdfdfd' }}>
                   Amount In Words: {toWords(grand.total)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20 }}>
                  <div style={{ textAlign: 'left', fontSize: '9.5px', fontWeight: 900, color: '#000', fontStyle: 'italic', whiteSpace: 'nowrap', paddingBottom: 5 }}>
                    * This is a computerized generated bill. Errors and omissions are accepted (E&OE).
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: 3 }}>
                      <img src="/assets/imtiaz-sign.png" alt="" style={{ maxHeight: '100%', maxWidth: '160px', objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                    </div>
                    <div style={{ width: '200px', borderTop: '2px solid #000', paddingTop: 8, marginLeft: 'auto' }}>
                      <div style={{ fontSize: '12px', fontWeight: 1000, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Muhammad Imtiaz ul Hassan</div>
                      <div style={{ fontSize: '9px', fontWeight: 900, color: '#000', textTransform: 'uppercase', marginTop: 2, textAlign: 'right', whiteSpace: 'nowrap' }}>CEO Hammad Rahim Filling station</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
