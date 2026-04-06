import { useRef } from 'react';
import { X, Printer, Droplet, Package, Landmark, DollarSign, BookOpen, ShoppingCart } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

type ReceiptType = 'purchase' | 'sale' | 'ledger' | 'expense' | 'asset' | 'liability';

interface TransactionReceiptModalProps {
  entity: any;
  type: ReceiptType;
  title?: string;
  onClose: () => void;
}

export default function TransactionReceiptModal({ entity, type, title, onClose }: TransactionReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!entity) return null;

  const handlePrint = () => {
    window.print();
  };

  const getIcon = () => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="w-8 h-8 text-slate-800" />;
      case 'sale': return <Droplet className="w-8 h-8 text-slate-800" />;
      case 'ledger': return <BookOpen className="w-8 h-8 text-slate-800" />;
      case 'expense': return <DollarSign className="w-8 h-8 text-slate-800" />;
      case 'asset': return <Package className="w-8 h-8 text-slate-800" />;
      case 'liability': return <Landmark className="w-8 h-8 text-slate-800" />;
      default: return null;
    }
  };

  const getTitle = () => {
    if (type === 'purchase' || type === 'sale') {
      return `${type} - ${entity.type || 'HSD'}`.toUpperCase();
    }
    if (title) return title;
    return type.toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:p-0 print:block">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:w-full print:max-w-none">
        {/* Header Actions - Hidden on Print */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transaction View</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Print Receipt">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={printRef} className="p-8 bg-white print:p-4 text-slate-800 font-mono">
          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-100 rounded-full flex items-center justify-center mb-4">
              {getIcon()}
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-widest text-center">{getTitle()}</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2 text-center">TRANSACTION VIEW</p>
          </div>

          <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-bold">{formatDate(entity.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trans ID:</span>
              <span className="font-bold">{entity.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600">COMPLETED</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4 mb-6">
            {(entity.details || entity.description) && (
              <div className="text-sm">
                <span className="block text-slate-500 mb-1 border-b border-slate-100 pb-1">Description</span>
                <span className="font-medium">{entity.details || entity.description}</span>
              </div>
            )}

            {/* Conditionally render fields based on type */}
            {(type === 'purchase' || type === 'sale') && (
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-bold">{entity.type || 'HSD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span>₨ {formatCurrency(entity.rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span>{entity.quantity.toLocaleString()} L</span>
                </div>
                {type === 'purchase' && entity.carriage > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Carriage:</span>
                    <span>₨ {formatCurrency(entity.carriage)}</span>
                  </div>
                )}
              </div>
            )}

            {(type === 'ledger' || type === 'asset' || type === 'liability') && (
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Debit (Dr):</span>
                  <span>{entity.debit ? `₨ ${formatCurrency(entity.debit)}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Credit (Cr):</span>
                  <span>{entity.credit ? `₨ ${formatCurrency(entity.credit)}` : '—'}</span>
                </div>
              </div>
            )}
            
            {type === 'expense' && (
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span>₨ {formatCurrency(entity.amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Total Section */}
          <div className="border-t-2 border-dashed border-slate-300 pt-4 mt-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Net Total</span>
              <span className="text-xl font-black text-slate-900">
                ₨ {
                  type === 'purchase' ? formatCurrency(entity.totalAmount) :
                  type === 'sale' || type === 'expense' ? formatCurrency(entity.amount) :
                  (type === 'ledger' || type === 'asset' || type === 'liability') ? formatCurrency(Math.max(entity.debit, entity.credit)) :
                  '0.00'
                }
              </span>
            </div>
          </div>
          
          <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Thank you for your business</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Generated by System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
