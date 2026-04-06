import { useState } from 'react';
import { Settings, UserPlus, Trash2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { settings, updateSettings, addUser, deleteUser } = useStore();
  const { toast } = useToast();

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'Staff' as const });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) return;
    
    addUser({ 
      name: userForm.name.trim(), 
      email: userForm.email.trim().toLowerCase(),
      password: userForm.password,
      role: userForm.role 
    });
    
    toast('User added successfully', 'success');
    setUserForm({ name: '', email: '', password: '', role: 'Staff' });
    setShowUserForm(false);
  };

  const handleUpdateStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    updateSettings({ startDate: date });
    toast(`Software start date set to ${date}`, 'success');
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-slate-600/10 dark:bg-slate-600/20 flex items-center justify-center">
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400">System configuration and access management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Record Settings */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-primary-500/5">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="font-bold text-slate-900 dark:text-white">Financial Setup</h2>
            </div>
          </div>
          <div className="p-6 flex-1 space-y-4">
            <div>
              <label className="label mb-2 block">Software Starting Date</label>
              <input 
                type="date" 
                className="input w-full" 
                value={settings.startDate} 
                onChange={handleUpdateStartDate}
              />
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs leading-relaxed">
                  <strong>Important:</strong> Setting a start date will hide all transactions and data recorded before this date across the entire software. 
                  Leave empty to show all records.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-emerald-500/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-bold text-slate-900 dark:text-white">User Management</h2>
            </div>
            <button 
              onClick={() => setShowUserForm(true)}
              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-0 flex-1 overflow-y-auto max-h-[300px]">
             {settings.users.length === 0 ? (
               <div className="p-8 text-center text-sm text-slate-400 italic">No additional users registered</div>
             ) : (
               <div className="divide-y divide-slate-100 dark:divide-dark-700/50">
                  {settings.users.map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-dark-700 text-slate-500 uppercase font-black">
                            {user.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => { deleteUser(user.id); toast('User deleted', 'warning'); }}
                        className={cn(
                          "p-2 transition-colors",
                          user.id === 'master-001' ? "opacity-20 cursor-not-allowed" : "text-slate-400 hover:text-red-500"
                        )}
                        disabled={user.id === 'master-001'}
                        title={user.id === 'master-001' ? "Master Admin cannot be deleted" : "Delete User"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      </div>

      {showUserForm && (
        <Modal title="Register New User" onClose={() => setShowUserForm(false)}>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input 
                className="input" 
                value={userForm.name} 
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div>
              <label className="label">Login Email</label>
              <input 
                type="email"
                className="input" 
                value={userForm.email} 
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Access Password</label>
              <input 
                type="password"
                className="input" 
                value={userForm.password} 
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="label">System Role</label>
              <select 
                className="input"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
              >
                <option value="Staff">Staff (Standard Access)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowUserForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Register User
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
