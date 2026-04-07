import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import { useStore, Category } from '../../store/useStore';
import { useToast } from '../ui/Toast';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categories: Category[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  title,
  categories,
  onAdd,
  onUpdate,
  onDelete
}: ManageCategoriesModalProps) {
  const { currentUser } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
    toast('Category created', 'success');
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;
    onUpdate(id, editingName.trim());
    setEditingId(null);
    toast('Category updated', 'success');
  };

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="space-y-6">
        {/* Add New Section */}
        <div className="bg-slate-50 dark:bg-dark-800/50 p-4 rounded-xl border border-slate-200 dark:border-dark-700/50">
          <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-3">Create New Category</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              className="input !py-2 !text-sm"
              placeholder="Enter category name (e.g. Utility Bills, Bank Fees)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="btn-primary !px-5 !py-2 flex items-center gap-2 flex-shrink-0 font-bold">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </form>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input !pl-10 !py-1.5 !text-xs"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List Section */}
        <div className="border border-slate-200 dark:border-dark-700/50 rounded-xl overflow-hidden bg-white dark:bg-dark-900 shadow-sm">
          <div className="p-3 border-b border-slate-100 dark:border-dark-700/30 flex items-center justify-between bg-slate-50/30 dark:bg-dark-800/20">
            <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest">Existing Categories</p>
            <span className="text-[10px] font-bold text-slate-400">{categories.length} total</span>
          </div>
          <div className="max-h-[450px] smart-scroll">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 italic bg-slate-50/50 dark:bg-dark-800/30">
                {search ? 'No matches found' : 'No categories yet'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-dark-700/50">
                {filtered.map((cat) => (
                  <div 
                    key={cat.id} 
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleStartEdit(cat)}
                  >
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          className="input !py-1 !px-2 !text-sm"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(cat.id)}
                        />
                        <button type="button" onClick={() => handleSaveEdit(cat.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-700 dark:text-dark-200">{cat.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => handleStartEdit(cat)} 
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-md transition-all"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'Admin' && (
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if(confirm('Delete category and all its entries?')) { onDelete(cat.id); toast('Category deleted', 'warning'); } }} 
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center italic">Only Admins can delete categories</p>
      </div>
    </Modal>
  );
}
