import { useEffect, useRef } from 'react';
import { X, Printer, FileText, Phone } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

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

type ReceiptType = 'purchase' | 'sale' | 'ledger' | 'expense' | 'asset' | 'liability' | 'customer';

interface TransactionReceiptModalProps {
  entity: any;
  type: ReceiptType;
  title?: string;
  onClose: () => void;
}

export default function TransactionReceiptModal({ entity, type, onClose }: TransactionReceiptModalProps) {
  useEffect(() => {
    if (!entity) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entity, onClose]);

  if (!entity) return null;

  const total = entity.amount || (entity.debit || entity.credit) || 0;

  const handlePrint = () => {
    try {
      const fc = (n: number) => formatCurrency(n);
      const fd = (d: string) => formatDate(d);
      
      const invNo = entity.billNo || entity.invoiceNo || (entity.id && typeof entity.id === 'string' ? entity.id.slice(0, 8).toUpperCase() : '———');
      const invTitle = (type || 'Receipt').toUpperCase();
      const invDate = fd(entity.date) || '—';

      const isSale = type === 'sale';
      const isPurchase = type === 'purchase';
      const isLedger = type === 'asset' || type === 'liability' || type === 'customer';
      const isExpense = type === 'expense';

      const HEADER = `
        <div style="border:4px double #111;padding:2px;margin-bottom:10px;font-family:'Times New Roman',serif;">
          <div style="border:1.2px solid #111;padding:12px 15px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <div style="width:85px;height:85px;"><img src="/assets/logo-hr.png" style="max-width:100%;max-height:100%;object-fit:contain;" onerror="this.style.display='none'"/></div>
              <div style="text-align:center;flex:1;">
                <div style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">Hammad Rahim Filling Station</div>
                <div style="font-size:10px;font-weight:700;font-style:italic;text-transform:uppercase;color:#444;margin-top:4px;">Muzafar Garh Road, Ada Ghyl Pur, District Jhang</div>
                <div style="display:flex;justify-content:center;gap:15px;text-transform:uppercase;font-size:9px;font-weight:900;margin-top:10px;">
                  <span>&#128222; +92-301-7221831</span><span>|</span><span>&#128222; +92-300-0989192</span>
                </div>
              </div>
              <div style="width:85px;height:85px;"><img src="/assets/logo-go.png" style="max-width:100%;max-height:100%;object-fit:contain;" onerror="this.style.display='none'"/></div>
            </div>
          </div>
        </div>`;

      let tableHTML = '';
      if (isSale || isPurchase) {
        tableHTML = `
          <table style="width:100%;border-collapse:collapse;border:2px solid #111;">
            <thead>
              <tr style="background:#f0f0f0;border-bottom:2px solid #111;">
                <th style="padding:12px;border-right:2px solid #111;text-align:left;font-size:14px;font-weight:900;text-transform:uppercase;">Description (Bill Details)</th>
                <th style="padding:12px;border-right:2px solid #111;text-align:right;font-size:14px;font-weight:900;text-transform:uppercase;width:110px;">Qty (L)</th>
                <th style="padding:12px;border-right:2px solid #111;text-align:right;font-size:14px;font-weight:900;text-transform:uppercase;width:110px;">Rate (₨)</th>
                <th style="padding:12px;text-align:right;font-size:14px;font-weight:900;text-transform:uppercase;width:150px;">Amount (₨)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:25px 15px;border-right:2px solid #111;vertical-align:top;">
                  <div style="font-size:18px;font-weight:900;color:#111;margin-bottom:8px;">${entity.details || entity.description || `${invTitle} Entry`}</div>
                  ${entity.vehicleNo ? `<div style="font-size:14px;font-weight:700;color:#444;">Vehicle No: ${entity.vehicleNo}</div>` : ''}
                </td>
                <td style="padding:25px 10px;border-right:2px solid #111;text-align:right;vertical-align:top;font-size:16px;font-weight:900;">${(entity.quantity || 0).toLocaleString()} L</td>
                <td style="padding:25px 10px;border-right:2px solid #111;text-align:right;vertical-align:top;font-size:16px;font-weight:900;">₨ ${fc(entity.rate)}</td>
                <td style="padding:25px 10px;text-align:right;vertical-align:top;font-size:20px;font-weight:900;">₨ ${fc(entity.amount)}</td>
              </tr>
              <tr style="height:550px;">
                <td style="border-right:2px solid #111;"></td><td style="border-right:2px solid #111;"></td><td style="border-right:2px solid #111;"></td><td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#f9f9f9;border-top:2.5px solid #111;">
                <td colspan="3" style="padding:12px 15px;text-align:right;font-size:12px;font-weight:900;text-transform:uppercase;">Page Total</td>
                <td style="padding:12px 15px;text-align:right;font-size:18px;font-weight:900;white-space:nowrap;">₨ ${fc(total)}</td>
              </tr>
            </tfoot>
          </table>`;
      } else if (isLedger) {
        tableHTML = `
          <table style="width:100%;border-collapse:collapse;border:2px solid #111;">
            <thead>
              <tr style="background:#f0f0f0;border-bottom:2px solid #111;">
                <th style="padding:8px;border-right:1.5px solid #111;text-align:left;font-size:11px;font-weight:900;text-transform:uppercase;">Description (Particulars)</th>
                <th style="padding:8px;border-right:1.5px solid #111;text-align:right;font-size:11px;font-weight:900;text-transform:uppercase;width:120px;">Debit (₨)</th>
                <th style="padding:8px;border-right:1.5px solid #111;text-align:right;font-size:11px;font-weight:900;text-transform:uppercase;width:120px;">Credit (₨)</th>
                <th style="padding:8px;text-align:right;font-size:11px;font-weight:900;text-transform:uppercase;width:150px;">Balance (₨)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:15px 12px;border-right:1.5px solid #111;vertical-align:top;">
                  <div style="font-size:13px;font-weight:900;color:#111;">${entity.description || 'N/A'}</div>
                </td>
                <td style="padding:15px 8px;border-right:1.5px solid #111;text-align:right;vertical-align:top;color:#dc2626;font-size:11px;">${entity.debit ? `₨ ${fc(entity.debit)}` : '—'}</td>
                <td style="padding:15px 8px;border-right:1.5px solid #111;text-align:right;vertical-align:top;color:#059669;font-size:11px;">${entity.credit ? `₨ ${fc(entity.credit)}` : '—'}</td>
                <td style="padding:15px 8px;text-align:right;vertical-align:top;font-size:14px;font-weight:900;">₨ ${fc(entity.balance)}</td>
              </tr>
              <tr style="height:280px;">
                <td style="border-right:1.5px solid #111;"></td><td style="border-right:1.5px solid #111;"></td><td style="border-right:1.5px solid #111;"></td><td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#f9f9f9;border-top:2.5px solid #111;">
                <td colspan="3" style="padding:12px 15px;text-align:right;font-size:12px;font-weight:900;text-transform:uppercase;">Page Total</td>
                <td style="padding:12px 15px;text-align:right;font-size:18px;font-weight:900;white-space:nowrap;">₨ ${fc(total)}</td>
              </tr>
            </tfoot>
          </table>`;
      } else {
        tableHTML = `
          <table style="width:100%;border-collapse:collapse;border:2px solid #111;">
            <thead>
              <tr style="background:#f0f0f0;border-bottom:2px solid #111;">
                <th style="padding:8px;border-right:1.5px solid #111;text-align:left;font-size:11px;font-weight:900;text-transform:uppercase;">Description (Expense Details)</th>
                <th style="padding:8px;text-align:right;font-size:11px;font-weight:900;text-transform:uppercase;width:150px;">Amount (₨)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:15px 12px;border-right:1.5px solid #111;vertical-align:top;">
                  <div style="font-size:13px;font-weight:900;color:#111;">${entity.details || entity.description || 'N/A'}</div>
                </td>
                <td style="padding:15px 8px;text-align:right;vertical-align:top;font-size:14px;font-weight:900;">₨ ${fc(entity.amount)}</td>
              </tr>
              <tr style="height:280px;">
                <td style="border-right:1.5px solid #111;"></td><td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#f9f9f9;border-top:2.5px solid #111;">
                <td style="padding:12px 15px;text-align:right;font-size:12px;font-weight:900;text-transform:uppercase;">Page Total</td>
                <td style="padding:12px 15px;text-align:right;font-size:18px;font-weight:900;white-space:nowrap;">₨ ${fc(total)}</td>
              </tr>
            </tfoot>
          </table>`;
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title><style>
        @page{size:A4 portrait;margin:0;}
        *,*::before,*::after{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
        html,body{margin:0;padding:0;background:#fff;font-family:'Times New Roman',serif;}
        .page{width:210mm;height:297mm;padding:12mm 12mm;display:flex;flex-direction:column;overflow:hidden;}
      </style></head><body>
        <div class="page">
          ${HEADER}
          <div style="display:flex;justify-content:space-between;border:2.5px solid #111;padding:8px 15px;margin-bottom:15px;font-size:11px;font-weight:900;text-transform:uppercase;background:#f5f5f5;">
            <span>Invoice No: ${invNo}</span><span>Bill Title: ${invTitle}</span><span>Dated: ${invDate}</span>
          </div>
          ${tableHTML}
          <div style="flex:1;"></div>
          <div style="padding-top:20px;margin-bottom:10mm;">
            <div style="border:2.5px solid #111;display:grid;grid-template-columns:1fr 1fr;background:#fdfdfd;">
              <div style="padding:10px 15px;border-right:2.5px solid #111;">
                <div style="font-size:9px;font-weight:900;text-transform:uppercase;">Reference/Invoice ID</div>
                <div style="font-size:16px;font-weight:900;font-style:italic;">${invNo}</div>
              </div>
              <div style="padding:10px 15px;background:#fff;">
                <div style="font-size:11px;font-weight:900;text-transform:uppercase;">Grand Total (PKR)</div>
                <div style="font-size:32px;font-weight:900;border-bottom:4px solid #000;display:inline-block;line-height:1;">₨ ${fc(total)}</div>
              </div>
            </div>
            <div style="padding:8px 12px;font-style:italic;font-size:10px;font-weight:900;border:2.5px solid #111;border-top:none;background:#fafafa;">
              Amount in words: <span style="text-transform:uppercase;">${toWords(total)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:30px;">
              <div>
                <div style="font-size:10px;font-weight:700;font-style:italic;color:#555;">This is a computer generated entry.<br/>Errors and omissions are accepted.</div>
                <div style="margin-top:12px;font-size:10px;color:#777;font-style:italic;text-align:center;font-weight:900;">Software Solution by Mb Soft and Tech — 0304-1654629</div>
              </div>
              <div style="text-align:center;width:280px;">
                <div style="width:100%;height:60px;border-bottom:2.5px solid #111;margin-bottom:5px;position:relative;">
                  <img src="/assets/imtiaz-sign.png" style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);height:75px;object-fit:contain;" onerror="this.style.display='none'"/>
                </div>
                <div style="font-size:14px;font-weight:900;text-transform:uppercase;">Muhammad Imtiaz ul Hassan</div>
                <div style="font-size:9px;font-weight:800;color:#444;">(Chief Executive Officer)</div>
              </div>
            </div>
          </div>
        </div>
      </body></html>`;

      let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.left = '-10000px';
        iframe.style.top = '-10000px';
        iframe.style.width = '210mm';
        iframe.style.height = '297mm';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      iframe.srcdoc = html;
      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        }, 1200);
      };
    } catch (err) {
      console.error('Print error:', err);
      alert('Print failed. Check console for details.');
    }
  };

  const getHeaders = () => {
    if (type === 'sale' || type === 'purchase') {
      return [
        { label: 'Description (Bill Details)', width: 'auto', align: 'left' },
        { label: 'Qty (L)', width: '90px', align: 'right' },
        { label: 'Rate (₨)', width: '90px', align: 'right' },
        { label: 'Amount (₨)', width: '120px', align: 'right' }
      ];
    }
    if (type === 'asset' || type === 'liability' || type === 'customer') {
      return [
        { label: 'Description (Particulars)', width: 'auto', align: 'left' },
        { label: 'Debit (₨)', width: '120px', align: 'right' },
        { label: 'Credit (₨)', width: '120px', align: 'right' },
        { label: 'Balance (₨)', width: '150px', align: 'right' }
      ];
    }
    if (type === 'expense') {
      return [
        { label: 'Description (Expense Details)', width: 'auto', align: 'left' },
        { label: 'Amount (₨)', width: '150px', align: 'right' }
      ];
    }
    return [];
  };

  const headers = getHeaders();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Times New Roman', serif",
      overflowY: 'auto', paddingBottom: 60,
    }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, width: '100%', maxWidth: '950px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 25px', background: 'rgba(15,23,42,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FileText style={{ width: 22, height: 22, color: '#3b82f6' }} />
          <span style={{ color: '#fff', fontWeight: 1000, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Invoice Preview</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontWeight: 1000, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', textTransform: 'uppercase' }}>
            <Printer style={{ width: 18, height: 18 }} /> Print Bill
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <X style={{ width: 22, height: 22 }} />
          </button>
        </div>
      </div>

      {/* Bill Content for Preview */}
      <div style={{
        marginTop: 40, width: '210mm', minHeight: '297mm', background: '#fff',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '15mm',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        borderRadius: 4, position: 'relative'
      }}>
        {/* Letterhead */}
        <div style={{ border: '4px double #111', padding: '2px', marginBottom: 20 }}>
          <div style={{ border: '1.2px solid #111', padding: '15px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <img src="/assets/logo-hr.png" style={{ width: 85, height: 85, objectFit: 'contain' }} alt="Logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#000', margin: 0, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>Hammad Rahim Filling Station</h1>
                <p style={{ fontSize: 11, fontWeight: 700, fontStyle: 'italic', color: '#444', margin: '4px 0', textTransform: 'uppercase' }}>Muzafar Garh Road, Ada Ghyl Pur, District Jhang</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 10, fontWeight: 900, marginTop: 10, color: '#000' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone style={{ width: 12, height: 12 }} />
                    <span>+92-301-7221831</span>
                  </div>
                  <span>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone style={{ width: 12, height: 12 }} />
                    <span>+92-300-0989192</span>
                  </div>
                </div>
              </div>
              <img src="/assets/logo-go.png" style={{ width: 85, height: 85, objectFit: 'contain' }} alt="Logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          </div>
        </div>

        {/* Invoice Info Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', border: '2.5px solid #111', padding: '10px 20px', marginBottom: 20, background: '#f8fafc', fontSize: 12, fontWeight: 1000, textTransform: 'uppercase' }}>
          <span>Invoice No: {entity.billNo || entity.invoiceNo || entity.id?.slice(0, 8).toUpperCase() || '———'}</span>
          <span>Bill Title: {type.toUpperCase()}</span>
          <span>Dated: {formatDate(entity.date)}</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2.5px solid #111' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2.5px solid #111' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: 12, textAlign: h.align as any, fontSize: 11, fontWeight: 1000, textTransform: 'uppercase', borderRight: i < headers.length - 1 ? '1.5px solid #111' : 'none', width: h.width }}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {type === 'sale' || type === 'purchase' ? (
                <>
                  <td style={{ padding: '20px 15px', borderRight: '1.5px solid #111', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#111', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.details || entity.description || 'Description N/A'}</div>
                    {entity.vehicleNo && <div style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>Vehicle No: {entity.vehicleNo}</div>}
                  </td>
                  <td style={{ padding: '20px 10px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', fontSize: 12 }}>{entity.quantity?.toLocaleString()} L</td>
                  <td style={{ padding: '20px 10px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', fontSize: 12 }}>₨ {formatCurrency(entity.rate)}</td>
                  <td style={{ padding: '20px 15px', textAlign: 'right', verticalAlign: 'top', fontSize: 15, fontWeight: 1000 }}>₨ {formatCurrency(entity.amount)}</td>
                </>
              ) : type === 'asset' || type === 'liability' || type === 'customer' ? (
                <>
                  <td style={{ padding: '20px 15px', borderRight: '1.5px solid #111', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#111' }}>{entity.description || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '20px 10px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', color: '#dc2626', fontSize: 12 }}>{entity.debit ? `₨ ${formatCurrency(entity.debit)}` : '—'}</td>
                  <td style={{ padding: '20px 10px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', color: '#059669', fontSize: 12 }}>{entity.credit ? `₨ ${formatCurrency(entity.credit)}` : '—'}</td>
                  <td style={{ padding: '20px 15px', textAlign: 'right', verticalAlign: 'top', fontSize: 15, fontWeight: 1000 }}>₨ {formatCurrency(entity.balance)}</td>
                </>
              ) : (
                <>
                  <td style={{ padding: '20px 15px', borderRight: '1.5px solid #111', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#111' }}>{entity.details || entity.description || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '20px 15px', textAlign: 'right', verticalAlign: 'top', fontSize: 15, fontWeight: 1000 }}>₨ {formatCurrency(entity.amount)}</td>
                </>
              )}
            </tr>
            {/* Fillers */}
            <tr style={{ height: 350 }}>
              {headers.map((_, i) => (
                <td key={i} style={{ borderRight: i < headers.length - 1 ? '1.5px solid #111' : 'none' }}></td>
              ))}
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2.5px solid #111' }}>
              <td colSpan={headers.length - 1} style={{ padding: '15px 20px', textAlign: 'right', fontSize: 13, fontWeight: 1000, textTransform: 'uppercase' }}>Page Total</td>
              <td style={{ padding: '15px 20px', textAlign: 'right', fontSize: 20, fontWeight: 1000, whiteSpace: 'nowrap' }}>₨ {formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer info */}
        <div style={{ marginTop: 'auto', paddingTop: 30 }}>
          <div style={{ border: '2.5px solid #111', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fdfdfd' }}>
            <div style={{ padding: '12px 20px', borderRight: '2.5px solid #111' }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Reference ID</div>
              <div style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: '#1e293b' }}>{entity.id?.slice(0, 12).toUpperCase()}</div>
            </div>
            <div style={{ padding: '12px 20px', background: '#fff' }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Grand Total (PKR)</div>
              <div style={{ fontSize: 24, fontWeight: 1000, color: '#000', borderBottom: '3px solid #000', display: 'inline-block' }}>₨ {formatCurrency(total)}</div>
            </div>
          </div>
          <div style={{ padding: '10px 15px', fontSize: 11, fontWeight: 1000, border: '2.5px solid #111', borderTop: 'none', background: '#f8fafc', fontStyle: 'italic' }}>
            Amount in words: <span style={{ textTransform: 'uppercase' }}>{toWords(total)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, paddingBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', color: '#555' }}>
                This is a computer generated entry.<br />Errors and omissions are accepted.
              </div>
              <div style={{ marginTop: 12, fontSize: '10px', color: '#777', fontStyle: 'italic', textAlign: 'center', fontWeight: 900 }}>
                Software Solution by Mb Soft and Tech — 0304-1654629
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '280px' }}>
              <div style={{ width: '100%', height: '60px', borderBottom: '2.5px solid #111', marginBottom: 5, position: 'relative' }}>
                <img src="/assets/imtiaz-sign.png" style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', height: '75px', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 1000, textTransform: 'uppercase' }}>Muhammad Imtiaz ul Hassan</div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#444' }}>(Chief Executive Officer)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
