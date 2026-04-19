import { useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, FileText, Download, Share2, Camera } from 'lucide-react';
import { toPng } from 'html-to-image';
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

type ReceiptType = 'purchase' | 'sale' | 'expense' | 'asset' | 'liability' | 'customer';

interface TransactionReceiptModalProps {
  entity: any;
  type: ReceiptType;
  title?: string;
  onClose: () => void;
}

export default function TransactionReceiptModal({ entity, type, onClose }: TransactionReceiptModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });

  const handleSaveImage = async () => {
    if (!contentRef.current) return;
    try {
      const dataUrl = await toPng(contentRef.current, { 
        backgroundColor: '#fff',
        pixelRatio: 2, // Higher quality
      });
      const link = document.createElement('a');
      link.download = `Bill_${type}_${entity.billNo || entity.id?.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
    }
  };

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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleSaveImage} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: 13, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Camera style={{ width: 16, height: 16 }} /> Save Image
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontWeight: 1000, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', textTransform: 'uppercase' }}>
            <Printer style={{ width: 18, height: 18 }} /> Save PDF / Print
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <X style={{ width: 22, height: 22 }} />
          </button>
        </div>
      </div>

      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .page-print-container { margin: 0 !important; padding: 0 !important; width: 210mm !important; }
          .report-page { 
            page-break-after: always; 
            margin: 0 !important; 
            width: 210mm !important;
            height: 297mm !important;
            transform: scale(1);
            transform-origin: top left;
          }
        }
      `}</style>

      <div ref={contentRef} className="page-print-container" style={{ width: '210mm', margin: '30px auto' }}>
        <div className="report-page" style={{ position: 'relative', width: '210mm', height: '297mm', background: '#fff', color: '#000', padding: '12mm 15mm', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          
          {/* Formal Letterhead */}
          <div style={{ border: '4px double #111', padding: '2px', marginBottom: '15px' }}>
            <div style={{ border: '1.2px solid #111', padding: '12px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ width: 85, height: 85 }}>
                  <img src="/assets/logo-hr.png" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 1000, textTransform: 'uppercase' }}>Hammad Rahim Filling Station</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', color: '#444', marginTop: 4 }}>Muzafar Garh Road, Ada Ghyl Pur, District Jhang</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', textTransform: 'uppercase', fontSize: '9px', fontWeight: 1000, marginTop: 6 }}>
                    <span>WhatsApp: +92-301-7221831</span>
                    <span style={{ color: '#111' }}>•</span>
                    <span>Phone: +92-300-0989192</span>
                  </div>
                </div>
                <div style={{ width: 85, height: 85 }}>
                  <img src="/assets/logo-go.png" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Meta Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', border: '2.5px solid #111', padding: '8px 15px', marginBottom: '15px', fontSize: '11px', fontWeight: 1000, textTransform: 'uppercase', background: '#f5f5f5' }}>
            <span>Invoice No: {entity.billNo || entity.invoiceNo || entity.id?.slice(0, 8).toUpperCase() || '———'}</span>
            <span>Bill Title: {type.toUpperCase()}</span>
            <span>Dated: {formatDate(entity.date)}</span>
          </div>

          {/* Main Content Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #111' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #111' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '8px', borderRight: i < headers.length - 1 ? '1.5px solid #111' : 'none', textAlign: h.align as any, fontSize: '11px', fontWeight: 1000, width: h.width }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '15px 12px', borderRight: (type !== 'expense') ? '1.5px solid #111' : 'none', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '13px', fontWeight: 1000, color: '#111', marginBottom: 4 }}>{entity.details || entity.description || `${type.toUpperCase()} Entry`}</div>
                  {entity.vehicleNo && <div style={{ fontSize: '10px', fontWeight: 700, color: '#444' }}>Vehicle No: {entity.vehicleNo}</div>}
                  {entity.invoiceNo && type !== 'purchase' && <div style={{ fontSize: '10px', fontWeight: 700, color: '#444' }}>Ref No: {entity.invoiceNo}</div>}
                </td>
                {type === 'sale' || type === 'purchase' ? (
                  <>
                    <td style={{ padding: '15px 8px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', fontSize: '11px' }}>{entity.quantity?.toLocaleString()} L</td>
                    <td style={{ padding: '15px 8px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', fontSize: '11px' }}>₨ {formatCurrency(entity.rate)}</td>
                    <td style={{ padding: '15px 8px', textAlign: 'right', verticalAlign: 'top', fontSize: '14px', fontWeight: 1000 }}>₨ {formatCurrency(entity.amount)}</td>
                  </>
                ) : (type === 'asset' || type === 'liability' || type === 'customer') ? (
                  <>
                    <td style={{ padding: '15px 8px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', color: '#dc2626', fontSize: '11px' }}>{entity.debit ? `₨ ${formatCurrency(entity.debit)}` : '—'}</td>
                    <td style={{ padding: '15px 8px', borderRight: '1.5px solid #111', textAlign: 'right', verticalAlign: 'top', color: '#059669', fontSize: '11px' }}>{entity.credit ? `₨ ${formatCurrency(entity.credit)}` : '—'}</td>
                    <td style={{ padding: '15px 8px', textAlign: 'right', verticalAlign: 'top', fontSize: '14px', fontWeight: 1000 }}>₨ {formatCurrency(entity.balance)}</td>
                  </>
                ) : (
                  <td style={{ padding: '15px 8px', textAlign: 'right', verticalAlign: 'top', fontSize: '14px', fontWeight: 1000 }}>₨ {formatCurrency(entity.amount)}</td>
                )}
              </tr>
              {/* Fill vertical space to push total to bottom and extend vertical lines */}
              <tr style={{ height: '450px' }}>
                {headers.map((_, i) => (
                  <td key={i} style={{ borderRight: i < headers.length - 1 ? '1.5px solid #111' : 'none' }}></td>
                ))}
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: '#f9f9f9', borderTop: '2.5px solid #111' }}>
                <td colSpan={headers.length - 1} style={{ padding: '12px 15px', textAlign: 'right', fontSize: '12px', fontWeight: 1000, textTransform: 'uppercase' }}>Total Bill Amount</td>
                <td style={{ padding: '12px 15px', textAlign: 'right', fontSize: '18px', fontWeight: 1000, whiteSpace: 'nowrap' }}>₨ {formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ flex: 1 }}></div>

          {/* Footer Totals */}
          <div style={{ paddingTop: 20, marginBottom: '10mm' }}>
            <div style={{ border: '2.5px solid #111', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fdfdfd' }}>
              <div style={{ padding: '10px 15px', borderRight: '2.5px solid #111' }}>
                <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Reference/Invoice ID</div>
                <div style={{ fontSize: '16px', fontWeight: 1000, fontStyle: 'italic' }}>{entity.billNo || entity.invoiceNo || entity.id?.slice(0, 8).toUpperCase() || '———'}</div>
              </div>
              <div style={{ padding: '10px 15px', background: '#fff' }}>
                <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase' }}>Gross Amount (PKR)</div>
                <div style={{ fontSize: '22px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block', lineHeight: 1 }}>
                  ₨ {formatCurrency(total)}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '8px 12px', fontStyle: 'italic', fontSize: '10px', fontWeight: 1000, border: '2.5px solid #111', borderTop: 'none', background: '#fafafa' }}>
              Amount in words: <span style={{ textTransform: 'uppercase' }}>{toWords(total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 30 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', color: '#555' }}>
                  This is a computer generated entry.<br />Errors and omissions are accepted.
                </div>
                <div style={{ marginTop: 12, fontSize: '9px', color: '#999', fontStyle: 'italic' }}>
                  Software Solution by <strong>Mb Soft and Tech</strong> — 0304-1646290
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
    </div>
  );
}
