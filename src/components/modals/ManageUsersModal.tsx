import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Shield, Mail, Key, User as UserIcon } from 'lucide-react';
import Modal from '../ui/Modal';
import { useStore, User } from '../../store/useStore';
import { useToast } from '../ui/Toast';

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageUsersModal({ isOpen, onClose }: ManageUsersModalProps) {
  const { settings, addUser, updateUser, deleteUser, currentUser } = useStore();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Staff' as 'Admin' | 'Staff' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return;
    addUser(newUser);
    setNewUser({ name: '', email: '', password: '', role: 'Staff' });
    setShowAddForm(false);
    toast('User account created', 'success');
  };

  const handleStartEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, email: user.email, role: user.role, password: user.password });
  };

  const handleSaveEdit = (id: string) => {
    updateUser(id, editForm);
    setEditingId(null);
    toast('User updated successfully', 'success');
  };

  return (
    <Modal title="System User Management" onClose={onClose} wide>
      <div className="space-y-6">
        {/* Statistics & Add Button */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-dark-800/50 p-4 rounded-2xl border border-slate-200 dark:border-dark-700/50">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-primary-600/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-600" />
             </div>
             <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{settings.users.length} Active Accounts</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Access Control List</p>
             </div>
          </div>
          <button 
            type="button" 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel Registration' : 'New User Account'}
          </button>
        </div>

        {/* Registration Form */}
        {showAddForm && (
          <div className="animate-in slide-in-from-top duration-300 bg-white dark:bg-dark-900 p-5 rounded-2xl border-2 border-primary-600/20 shadow-xl">
             <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4">Account Registration</p>
             <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="input !pl-10" placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="input !pl-10" type="email" placeholder="Email Address" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="input !pl-10" type="password" placeholder="Account Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                </div>
                <div>
                  <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                    <option value="Staff">Staff (Standard Access)</option>
                    <option value="Admin">Administrator (Full Access)</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end">
                   <button type="submit" className="btn-primary !px-10 font-bold">Register User</button>
                </div>
             </form>
          </div>
        )}

        {/* User List */}
        <div className="border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden bg-white dark:bg-dark-910 shadow-sm">
           <div className="p-3 border-b border-slate-100 dark:border-dark-700/30 bg-slate-50/50 dark:bg-dark-800/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active System Logins</p>
           </div>
           <div className="max-h-[400px] smart-scroll divide-y divide-slate-100 dark:divide-dark-700/30">
              {settings.users.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-800/20 transition-all group">
                   {editingId === user.id ? (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1 mr-6">
                        <input className="input !py-1.5 !text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        <input className="input !py-1.5 !text-sm" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                        <select className="input !py-1.5 !text-sm" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as any})}>
                           <option value="Admin">Admin</option>
                           <option value="Staff">Staff</option>
                        </select>
                        <div className="flex items-center gap-2 justify-end">
                           <button type="button" onClick={() => handleSaveEdit(user.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg"><Check className="w-5 h-5" /></button>
                           <button type="button" onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                     </div>
                   ) : (
                     <>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${user.role === 'Admin' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20' : 'bg-slate-100 text-slate-500 dark:bg-dark-800'}`}>
                              {user.name.substring(0, 1).toUpperCase()}
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <p className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                                 <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${user.role === 'Admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                    {user.role}
                                 </span>
                                 {user.email === 'master@gmail.com' && <span className="text-[9px] text-primary-600 font-black italic">Master Admin</span>}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-dark-400">{user.email}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button type="button" onClick={() => handleStartEdit(user)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                           {user.email !== 'master@gmail.com' && user.id !== currentUser?.id && (
                             <button type="button" onClick={() => { if(confirm('Permanently delete this user account?')) deleteUser(user.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                           )}
                        </div>
                     </>
                   )}
                </div>
              ))}
           </div>
        </div>
        <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/20">
           <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
           <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
             <strong>Security Note:</strong> Master administrative accounts cannot be deleted. Changes to user roles or permissions will take effect upon the user's next login session. Ensure all passwords are kept confidential.
           </p>
        </div>
      </div>
    </Modal>
  );
}
