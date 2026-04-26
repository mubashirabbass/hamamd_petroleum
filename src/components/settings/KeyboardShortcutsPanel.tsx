import { useState, useEffect } from 'react';
import { Keyboard, Trash2, Plus, RefreshCcw, Save, Zap, Hash } from 'lucide-react';
import { useStore, Shortcut } from '../../store/useStore';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

const AVAILABLE_TARGETS = [
  { label: 'Dashboard',   path: '/',           params: '' },
  { label: 'Purchase',    path: '/purchase',    params: '' },
  { label: 'Sale',        path: '/sale',        params: '' },
  { label: 'Expense',     path: '/expense',     params: '' },
  { label: 'Add Expense', path: '/expense',     params: 'action=add' },
  { label: 'Asset',       path: '/asset',       params: '' },
  { label: 'Liability',   path: '/liability',   params: '' },
  { label: 'Stock',       path: '/stock',       params: '' },
  { label: 'HSD Stock',   path: '/stock/HSD',   params: '' },
  { label: 'PMG Stock',   path: '/stock/PMG',   params: '' },
  { label: 'Customer',    path: '/customer',    params: '' },
  { label: 'Add Customer',path: '/customer',    params: 'tab=register' },
  { label: 'Settings',    path: '/settings',    params: '' },
];

const DEFAULT_SHORTCUTS: Omit<Shortcut, 'id'>[] = [
  { key: 'F1',  label: 'Dashboard',   targetPath: '/' },
  { key: 'F2',  label: 'Purchase',    targetPath: '/purchase' },
  { key: 'F3',  label: 'Sale',        targetPath: '/sale' },
  { key: 'F5',  label: 'Expense',     targetPath: '/expense' },
  { key: 'F6',  label: 'Asset',       targetPath: '/asset' },
  { key: 'F7',  label: 'Liability',   targetPath: '/liability' },
  { key: 'F8',  label: 'Stock',       targetPath: '/stock' },
  { key: 'F9',  label: 'Customer',    targetPath: '/customer' },
  { key: 'F10', label: 'Settings',    targetPath: '/settings' },
];

export default function KeyboardShortcutsPanel() {
  const { settings, updateSettings } = useStore();
  const { toast } = useToast();
  const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>(settings.shortcuts);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalShortcuts(settings.shortcuts);
  }, [settings.shortcuts]);

  const handleRecord = (id: string) => {
    setRecordingId(id);
    toast('Press any key on your keyboard to set the shortcut...', 'info');
  };

  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = e.key;
      
      // Update local state
      setLocalShortcuts(prev => prev.map(s => 
        s.id === recordingId ? { ...s, key: newKey } : s
      ));
      
      setRecordingId(null);
      toast(`Key "${newKey}" set successfully!`, 'success');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingId, toast]);

  const handleAdd = () => {
    const newShortcut: Shortcut = {
      id: Math.random().toString(36).substr(2, 9),
      key: '?',
      label: 'New Action',
      targetPath: '/',
    };
    setLocalShortcuts([...localShortcuts, newShortcut]);
  };

  const handleDelete = (id: string) => {
    setLocalShortcuts(localShortcuts.filter(s => s.id !== id));
  };

  const handleTargetChange = (id: string, targetLabel: string) => {
    const target = AVAILABLE_TARGETS.find(t => t.label === targetLabel);
    if (!target) return;

    setLocalShortcuts(prev => prev.map(s => 
      s.id === id ? { 
        ...s, 
        label: target.label, 
        targetPath: target.path, 
        searchParams: target.params 
      } : s
    ));
  };

  const handleSave = async () => {
    await updateSettings({ shortcuts: localShortcuts });
    toast('Keyboard shortcuts updated and saved!', 'success');
  };

  const handleReset = () => {
    const reset = DEFAULT_SHORTCUTS.map((s, idx) => ({ ...s, id: String(idx + 1) }));
    setLocalShortcuts(reset);
    toast('Shortcuts reset to system defaults. Click Save to apply.', 'info');
  };

  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50 flex-1 min-h-0 flex flex-col animate-in fade-in duration-500 h-full">
      <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-primary-500/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Keyboard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Keyboard Shortcut Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 transition-all">
            <RefreshCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase bg-primary-600 text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all">
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto smart-scroll">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {localShortcuts.map((shortcut) => (
            <div key={shortcut.id} className="p-4 rounded-2xl border border-slate-200 dark:border-dark-700/50 bg-white dark:bg-dark-900/50 flex flex-col gap-4 relative group hover:border-primary-500/30 transition-all shadow-sm">
              <button 
                onClick={() => handleDelete(shortcut.id)}
                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95 z-20"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary-600" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Binding</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "px-3 py-1 rounded-lg border font-mono text-xs font-black shadow-inner transition-all",
                     recordingId === shortcut.id 
                       ? "bg-amber-100 border-amber-500 text-amber-700 animate-pulse" 
                       : "bg-slate-100 dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                   )}>
                     {shortcut.key === ' ' ? 'Space' : shortcut.key}
                   </div>
                   <button 
                    onClick={() => handleRecord(shortcut.id)}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-dark-800 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Re-record key"
                   >
                     <RefreshCcw className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Target Action</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                  value={shortcut.label}
                  onChange={(e) => handleTargetChange(shortcut.id, e.target.value)}
                >
                  {AVAILABLE_TARGETS.map(t => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAdd}
            className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-dark-700 text-slate-400 hover:border-primary-500/50 hover:text-primary-600 transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Add Custom Shortcut</p>
          </button>
        </div>
      </div>

      <div className="p-5 border-t border-slate-200 dark:border-dark-700/50 bg-slate-50 dark:bg-dark-900/50 flex gap-4 text-slate-500 text-[10px] font-medium leading-relaxed">
        <Hash className="w-4 h-4 text-primary-500 shrink-0" />
        <p>
          <strong>Usage Hint:</strong> Bind keys to your most frequent tasks. For example, bind <strong>'S'</strong> to <strong>Sale</strong> or 
          <strong>'Enter'</strong> to <strong>Search</strong>. Recorded keys are applied immediately after saving.
        </p>
      </div>
    </div>
  );
}
