import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Search, Phone, User } from 'lucide-react';
import Modal from '../ui/Modal';
import { useStore, Customer } from '../../store/useStore';
import { useToast } from '../ui/Toast';

interface ManageCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'register' | 'manage';
}

export default function ManageCustomersModal({ isOpen, onClose, mode }: ManageCustomersModalProps) {
  const { customers, addCustomer, updateCustomer, deleteCustomer, currentUser } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCustomer({ name: newName.trim(), phone: newPhone.trim() });
    setNewName('');
    setNewPhone('');
    toast('Customer registered', 'success');
    onClose(); // Auto-close on register to return to list
  };

  const handleStartEdit = (cust: Customer) => {
    setEditingId(cust.id);
    setEditForm({ name: cust.name, phone: cust.phone || '' });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;
    updateCustomer(id, { name: editForm.name.trim(), phone: editForm.phone.trim() });
    setEditingId(null);
    toast('Customer updated', 'success');
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <Modal title={mode === 'register' ? "Register New Customer" : "Manage Customer Database"} onClose={onClose} wide>
      <div className="space-y-6">
        {/* Registration Section - ONLY show in register mode */}
        {mode === 'register' && (
          <div className="bg-slate-50 dark:bg-dark-800/50 p-5 rounded-2xl border border-slate-200 dark:border-dark-700/50">
            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4">Registration Form</p>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 !py-2.5"
                  placeholder="Full Name *"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 !py-2.5"
                  placeholder="Phone Number (e.g. 0300-1234567)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="btn-primary !px-8 !py-2.5 flex items-center gap-2 font-bold shadow-lg shadow-primary-600/20">
                  <Plus className="w-4 h-4" /> Register Customer
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Statistics - ONLY show in manage mode */}
        {mode === 'manage' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 !py-2 !text-sm"
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="px-4 py-2 bg-slate-100 dark:bg-dark-800 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {customers.length} Registered Customers
              </div>
            </div>

            {/* Customer List */}
            <div className="border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-dark-900">
               <div className="max-h-[450px] smart-scroll">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400 italic bg-slate-50/30 dark:bg-dark-800/20">
                    {search ? 'No matching customers found' : 'No customers registered yet'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-dark-700/30">
                    {filtered.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-800/30 transition-colors group">
                        {editingId === c.id ? (
                          <div className="flex flex-col md:flex-row gap-3 flex-1 mr-6">
                            <input
                              autoFocus
                              className="input !py-1.5 !px-3 !text-sm flex-1"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                            <input
                              className="input !py-1.5 !px-3 !text-sm flex-1"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              placeholder="Phone"
                            />
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => handleSaveEdit(c.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg">
                                <Check className="w-5 h-5" />
                              </button>
                              <button type="button" onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-500 font-black text-xs">
                                {c.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{c.name}</p>
                                {c.phone && <p className="text-xs text-slate-500 dark:text-dark-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                type="button"
                                onClick={() => handleStartEdit(c)} 
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg"
                                title="Edit Customer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {currentUser?.role === 'Admin' && (
                                <button 
                                  type="button"
                                  onClick={() => { if(confirm('Delete customer and all transaction history?')) { deleteCustomer(c.id); toast('Customer deleted', 'warning'); } }} 
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                                  title="Delete Account"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          </>
        )}
        <p className="text-[10px] text-slate-400 text-center italic">Customer history is preserved unless the account is deleted by an Administrator</p>
      </div>
    </Modal>
  );
}
