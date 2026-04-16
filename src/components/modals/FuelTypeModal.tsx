import { Fuel, Zap, X } from 'lucide-react';
import type { FuelType } from '../../store/useStore';

interface FuelModalProps {
  title: string;
  onSelect: (type: FuelType) => void;
  onClose: () => void;
}

export default function FuelTypeModal({ title, onSelect, onClose }: FuelModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-dark-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-500 dark:text-dark-400 text-sm mb-6 text-center">Select the fuel type to continue</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('HSD')}
            className="group flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-amber-500/20 dark:border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 hover:border-amber-500/50 dark:hover:border-amber-500/60 transition-all duration-200 active:scale-95"
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30 transition-colors">
              <Fuel className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-amber-600 dark:text-amber-400 font-bold text-xl">HSD</p>
              <p className="text-slate-500 dark:text-dark-400 text-xs mt-1">High Speed Diesel</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('PMG')}
            className="group flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 hover:border-emerald-500/50 dark:hover:border-emerald-500/60 transition-all duration-200 active:scale-95"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30 transition-colors">
              <Zap className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xl">PMG</p>
              <p className="text-slate-500 dark:text-dark-400 text-xs mt-1">Petrol / Motor Gasoline</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
