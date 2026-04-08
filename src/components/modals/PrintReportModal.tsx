import { useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Props {
  data: any[];
  type: 'sale' | 'purchase' | 'ledger' | 'expense' | 'asset' | 'liability' | 'customer';
  onClose: () => void;
  title?: string;
  customerPhone?: string;
}

const ROWS_PER_PAGE = 26;

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
// buildPrintHTML removed as we now use react-to-print on the live DOM.

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
      fontFamily: "'Times New Roman', serif",
      overflowY: 'auto', paddingBottom: 60,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, width: '100%', maxWidth: '950px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 25px', background: 'rgba(15,23,42,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FileText style={{ width: 20, height: 20, color: '#3b82f6' }} />
          <span style={{ color: '#fff', fontWeight: 1000, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Report Document Preview</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', fontWeight: 1000, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', textTransform: 'uppercase' }}>
            <Printer style={{ width: 18, height: 18 }} /> Print Ready
          </button>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}>
            <X style={{ width: 22, height: 22 }} />
          </button>
        </div>
      </div>

      <div ref={contentRef} className="page-print-container no-print-shadow" style={{ width: '210mm', marginTop: 30, marginBottom: 20 }}>
          <div className="print:hidden" style={{ background: '#fff', padding: '15px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previewing {data.length} Transactions</p>
              <p style={{ fontSize: '12px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paper Size: A4 Portrait</p>
          </div>
          {chunks.map((chunk, pi) => {
            const isLast = pi === chunks.length - 1;
            
            // Re-calculating summary for preview
            let grandTotal = 0;
            let totalQty = 0;
            let totalDebit = 0;
            let totalCredit = 0;
            const isLedger = type === 'ledger' || type === 'asset' || type === 'liability' || type === 'customer';
            const isSale = type === 'sale';
            const isPurchase = type === 'purchase';
            const isExpense = type === 'expense';

            if (isSale || isPurchase) {
              grandTotal = data.reduce((s, x) => s + (x.totalAmount ?? x.amount ?? 0), 0);
              totalQty = data.reduce((s, x) => s + (x.quantity || 0), 0);
            } else if (isExpense) {
              grandTotal = data.reduce((s, x) => s + (x.amount || 0), 0);
            } else if (isLedger) {
              totalDebit = data.reduce((s, x) => s + (x.debit || 0), 0);
              totalCredit = data.reduce((s, x) => s + (x.credit || 0), 0);
              grandTotal = Math.abs(totalDebit - totalCredit);
            }

            return (
              <div key={pi} className="report-page" style={{ position: 'relative', width: '210mm', minHeight: '297mm', background: '#fff', color: '#000', padding: '12mm 15mm 12mm', margin: '0 auto', boxShadow: 'none', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                {/* Visual Header */}
                <div style={{ border: '4px double #111', padding: '2px', marginBottom: '15px' }}>
                  <div style={{ border: '1.2px solid #111', padding: '12px 15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                      <div style={{ width: 85, height: 85, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/assets/logo-hr.png" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: 1000, textTransform: 'uppercase' }}>Hammad Rahim Filling Station</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', color: '#444', marginTop: 4 }}>Muzafar Garh Road, Ada Ghyl Pur, District Jhang</div>
                      </div>
                      <div style={{ width: 85, height: 85, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/assets/logo-go.png" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>
                    </div>
                  </div>
                </div>

                {/* Sub Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', border: '2px solid #111', padding: '8px 15px', marginBottom: '15px', fontSize: '11px', fontWeight: 1000, textTransform: 'uppercase', background: '#f9f9f9', letterSpacing: '0.5px' }}>
                  <span>{customTitle || type.toUpperCase() + ' REPORT'}</span>
                  <span>Period: {dateRange}</span>
                  <span>Page {pi + 1} / {chunks.length}</span>
                </div>

                {/* Customer Meta Row */}
                {type === 'customer' && pi === 0 && (
                   <div style={{ marginBottom: 15, border: '1px solid #eee', padding: 10, background: '#fafafa' }}>
                      <div style={{ fontSize: 13, fontWeight: 1000, borderBottom: '1px solid #111', paddingBottom: 4, marginBottom: 6 }}>CLIENT DETAILS:</div>
                      <div style={{ display: 'flex', gap: 30 }}>
                         <div><span style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>NAME:</span> <span style={{ fontWeight: 1000 }}>{customTitle?.split('—')[1]?.trim() || 'N/A'}</span></div>
                         <div><span style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>PHONE:</span> <span style={{ fontWeight: 1000 }}>{customerPhone || '—'}</span></div>
                      </div>
                   </div>
                )}

                {/* Table Data */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', borderLeft: '2px solid #111', borderRight: '2px solid #111', borderBottom: '2px solid #111' }}>
                  <thead style={{ background: '#f0f0f0', borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
                    <tr>
                        {isSale || isPurchase ? (
                            <>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Sr.</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Inv No</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Date</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Details</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Rate</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Qty</th>
                                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                            </>
                        ) : isLedger ? (
                            <>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Sr.</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Inv No</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Date</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Description</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Debit</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Credit</th>
                                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Balance</th>
                            </>
                        ) : (
                            <>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Sr.</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Inv No</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Date</th>
                                <th style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>Details</th>
                                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                            </>
                        )}
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((row: any, idx: number) => {
                      const balVal = row.balance ?? 0;
                      const balText = type === 'customer' 
                        ? `${formatCurrency(Math.abs(balVal))} ${balVal >= 0 ? '(Dr)' : '(Cr)'}`
                        : `₨ ${formatCurrency(balVal)}`;
                      
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>{pi * ROWS_PER_PAGE + idx + 1}</td>
                          {isSale || isPurchase ? (
                              <>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', fontWeight: 'bold' }}>{row.billNo}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{isPurchase ? row.details : row.type}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{row.quantity}</td>
                                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.totalAmount ?? row.amount)}</td>
                              </>
                          ) : isLedger ? (
                              <>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', fontWeight: 'bold' }}>{row.billNo || '—'}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{row.description}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{balText}</td>
                              </>
                          ) : (
                              <>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', fontWeight: 900 }}>{row.billNo || '—'}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                                  <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0' }}>{row.details}</td>
                                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 900 }}>{formatCurrency(row.amount)}</td>
                              </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', background: '#fdfdfd', fontWeight: 900, color: '#000' }}>
                    {isSale || isPurchase ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>PAGE TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>{chunk.reduce((s: number, x: any) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>₨ {formatCurrency(chunk.reduce((s: number, x: any) => s + (x.totalAmount ?? x.amount ?? 0), 0))}</td>
                      </tr>
                    ) : isLedger ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>PAGE TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>₨ {formatCurrency(chunk.reduce((s: number, x: any) => s + (x.debit || 0), 0))}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>₨ {formatCurrency(chunk.reduce((s: number, x: any) => s + (x.credit || 0), 0))}</td>
                        <td></td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>PAGE TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 1000, color: '#000' }}>₨ {formatCurrency(chunk.reduce((s: number, x: any) => s + (x.amount || 0), 0))}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
                
                <div style={{ flex: 1 }}></div>

                {isLast && (
                  <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                    <div style={{ border: '2px solid #000', display: 'grid', gridTemplateColumns: `repeat(${isLedger ? 3 : 2}, 1fr)`, background: '#f8f8f8' }}>
                         {isSale || isPurchase ? (
                             <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>Total Vol</div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>{totalQty.toLocaleString()} L</div>
                             </div>
                         ) : isLedger ? (
                             <>
                                <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>Total Debit</div>
                                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>₨ {formatCurrency(totalDebit)}</div>
                                </div>
                                <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>Total Credit</div>
                                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>₨ {formatCurrency(totalCredit)}</div>
                                </div>
                             </>
                         ) : (
                            <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                                <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>Count</div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>{data.length} Trans</div>
                            </div>
                         )}
                         <div style={{ padding: '10px 15px', background: '#fff' }}>
                            <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase', color: '#000' }}>Current Balance</div>
                            <div style={{ fontSize: '20px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block' }}>
                                ₨ {formatCurrency(grandTotal)} {type === 'customer' ? (totalDebit >= totalCredit ? '(Dr)' : '(Cr)') : ''}
                            </div>
                         </div>
                    </div>
                    
                    <div style={{ padding: '8px 12px', fontStyle: 'italic', fontSize: '10px', fontWeight: 1000, border: '2px solid #111', borderTop: 'none' }}>
                        Amount in words: <span style={{ textTransform: 'uppercase' }}>{toWords(grandTotal)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 25 }}>
                       <div style={{ textAlign: 'left', fontSize: '11px', fontWeight: 1000, fontStyle: 'italic', textTransform: 'uppercase' }}>* Verified Final Report <br /> * E&OE</div>
                       <div style={{ textAlign: 'center', width: '280px' }}>
                         <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 5 }}>
                           <img src="/assets/imtiaz-sign.png" style={{ maxHeight: '100%', maxWidth: '200px' }} />
                         </div>
                         <div style={{ borderTop: '2.5px solid #111', paddingTop: 8 }}>
                           <div style={{ fontSize: '16px', fontWeight: 1000, textTransform: 'uppercase' }}>Muhammad Imtiaz ul Hassan</div>
                           <div style={{ fontSize: '11px', fontWeight: 1000, textTransform: 'uppercase' }}>CEO Hammad Rahim Filling station</div>
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
