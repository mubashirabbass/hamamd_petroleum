import { useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Props {
  data: any[];
  type: 'sale' | 'purchase' | 'expense' | 'asset' | 'liability' | 'customer' | 'stock';
  onClose: () => void;
  title?: string;
  customerPhone?: string;
}

const ROWS_PER_PAGE = 32; // Increased since we removed footers

export default function PrintReportModal({ data, type, onClose, title: customTitle, customerPhone }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef });

  const dates = data.map(x => x.date).sort();
  const dateRange = dates.length
    ? `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`
    : 'All Period';

  const chunks: any[][] = [];
  for (let i = 0; i < data.length; i += ROWS_PER_PAGE) chunks.push(data.slice(i, i + ROWS_PER_PAGE));
  if (chunks.length === 0) chunks.push([]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,6,23,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Inter', sans-serif",
      overflowY: 'auto', paddingBottom: 60,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, width: '100%', maxWidth: '950px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 25px', background: 'rgba(15,23,42,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FileText style={{ width: 20, height: 20, color: '#ec4899' }} />
          <span style={{ color: '#fff', fontWeight: 1000, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Report Preview</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 28px', borderRadius: 12, background: '#ec4899', color: '#fff', fontWeight: 1000, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(236,72,153,0.3)', textTransform: 'uppercase' }}>
            <Printer style={{ width: 18, height: 18 }} /> Print Document
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <X style={{ width: 22, height: 22 }} />
          </button>
        </div>
      </div>

      <div ref={contentRef} className="page-print-container" style={{ width: '210mm', marginTop: 30, marginBottom: 20 }}>
          {chunks.map((chunk, pi) => {
            const isLast = pi === chunks.length - 1;
            const isLedger = type === 'asset' || type === 'liability' || type === 'customer';
            const isSale = type === 'sale';
            const isPurchase = type === 'purchase';
            const isStock = type === 'stock';

            return (
              <div key={pi} className="report-page" style={{ position: 'relative', width: '210mm', minHeight: '297mm', background: '#fff', color: '#000', padding: '15mm', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                {/* Clean Header */}
                <div style={{ textAlign: 'center', marginBottom: 25, borderBottom: '2px solid #000', paddingBottom: 15 }}>
                  <h1 style={{ fontSize: '28px', fontWeight: 1000, textTransform: 'uppercase', margin: 0 }}>Hammad Rahim Filling Station</h1>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#444', margin: '4px 0' }}>Muzafar Garh Road, Ada Ghyl Pur, District Jhang</p>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#666', margin: 0 }}>Contact: 0304-1654629 / 0300-1234567</p>
                </div>

                {/* Sub Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', border: '1.5px solid #000', padding: '10px 15px', marginBottom: 20, fontSize: '11px', fontWeight: 1000, textTransform: 'uppercase', background: '#f5f5f5' }}>
                  <span>{customTitle || type.toUpperCase() + ' REPORT'}</span>
                  <span>{dateRange}</span>
                  <span>Page {pi + 1} / {chunks.length}</span>
                </div>

                {/* Client Meta (Only for Customer module) */}
                {type === 'customer' && pi === 0 && (
                   <div style={{ marginBottom: 20, borderBottom: '1.5px solid #000', paddingBottom: 10, display: 'flex', gap: 40 }}>
                      <div><span style={{ fontSize: '10px', fontWeight: 900, color: '#666' }}>CLIENT:</span> <span style={{ fontWeight: 1000 }}>{customTitle?.split('—')[1]?.trim() || 'N/A'}</span></div>
                      <div><span style={{ fontSize: '10px', fontWeight: 900, color: '#666' }}>PHONE:</span> <span style={{ fontWeight: 1000 }}>{customerPhone || '—'}</span></div>
                   </div>
                )}

                {/* Respective Tables */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead style={{ background: '#eee', border: '1.5px solid #000' }}>
                    <tr>
                        {isSale ? (
                            <>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Rate</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Qty (L)</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Amount</th>
                            </>
                        ) : isPurchase ? (
                            <>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Invoice No</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Qty (L)</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Total Amount</th>
                            </>
                        ) : isLedger ? (
                            <>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Debit</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Credit</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Balance</th>
                            </>
                        ) : isStock ? (
                            <>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Details</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>In (L)</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Out (L)</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Balance</th>
                            </>
                        ) : (
                            <>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Inv No</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Details</th>
                                <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Amount</th>
                            </>
                        )}
                    </tr>
                  </thead>
                  <tbody style={{ border: '1.5px solid #000' }}>
                    {chunk.map((row: any, idx: number) => (
                        <tr key={idx}>
                          {isSale ? (
                              <>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.description || row.type || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 800 }}>{row.quantity?.toLocaleString()}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 1000 }}>{formatCurrency(row.amount)}</td>
                              </>
                          ) : isPurchase ? (
                              <>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 800 }}>{row.invoiceNo || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.description || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 800 }}>{row.quantity?.toLocaleString()}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 1000 }}>{formatCurrency(row.totalAmount)}</td>
                              </>
                          ) : isLedger ? (
                              <>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.description || (row.debit ? 'Sale' : 'Payment') || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right' }}>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 1000 }}>
                                    {row.balance !== undefined ? `${formatCurrency(Math.abs(row.balance))} ${row.balance >= 0 ? '(Dr)' : '(Cr)'}` : '—'}
                                  </td>
                              </>
                          ) : isStock ? (
                              <>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.details || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', color: '#059669' }}>{row.qtyIn ? `+${row.qtyIn.toLocaleString()}` : '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', color: '#dc2626' }}>{row.qtyOut ? `-${row.qtyOut.toLocaleString()}` : '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 1000 }}>{row.balance?.toLocaleString()} L</td>
                              </>
                          ) : (
                              <>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.billNo || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.details || '—'}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 1000 }}>{formatCurrency(row.amount)}</td>
                              </>
                          )}
                        </tr>
                    ))}
                  </tbody>
                  {isLast && (
                    <tfoot style={{ background: '#f9f9f9', border: '1.5px solid #000', fontWeight: 1000 }}>
                      {isSale ? (
                         <tr>
                           <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>TOTAL SALES:</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>{data.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(data.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                         </tr>
                      ) : isPurchase ? (
                         <tr>
                           <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>TOTAL PURCHASES:</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>{data.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(data.reduce((s, x) => s + (x.totalAmount || 0), 0))}</td>
                         </tr>
                      ) : isLedger ? (
                         <tr>
                           <td colSpan={2} style={{ padding: '8px', textAlign: 'right' }}>CLOSING BALANCE:</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(data.reduce((s, x) => s + (x.debit || 0), 0))}</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(data.reduce((s, x) => s + (x.credit || 0), 0))}</td>
                           <td style={{ padding: '8px', textAlign: 'right' }}>
                             ₨ {(() => {
                               const dr = data.reduce((s, x) => s + (x.debit || 0), 0);
                               const cr = data.reduce((s, x) => s + (x.credit || 0), 0);
                               const net = dr - cr;
                               return `${formatCurrency(Math.abs(net))} ${net >= 0 ? '(Dr)' : '(Cr)'}`;
                             })()}
                           </td>
                         </tr>
                      ) : isStock ? (
                        <tr>
                          <td colSpan={2} style={{ padding: '8px', textAlign: 'right' }}>PERIOD TOTAL:</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>+{data.reduce((s, x) => s + (x.qtyIn || 0), 0).toLocaleString()} L</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>-{data.reduce((s, x) => s + (x.qtyOut || 0), 0).toLocaleString()} L</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{data[0]?.balance?.toLocaleString()} L</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(data.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
                <div style={{ marginTop: 'auto', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#666', fontStyle: 'italic' }}>Report Generated on: {new Date().toLocaleString()}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
