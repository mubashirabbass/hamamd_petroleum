import { useState } from 'react';
import { Settings, UserPlus, Trash2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { settings, updateSettings, addUser, deleteUser, currentUser } = useStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'Staff' as const });
  
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 dark:text-dark-500 animate-fade-in">
        <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-sm">You do not have permission to access system settings.</p>
        <p className="text-[10px] mt-4 uppercase tracking-widest opacity-50">Authorized Personnel Only</p>
      </div>
    );
  }

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

  const tabs = [
    { id: 'general', label: 'General Setup', icon: Settings, color: 'bg-primary-600', text: 'text-primary-600' },
    { id: 'users', label: 'User Management', icon: ShieldCheck, color: 'bg-emerald-600', text: 'text-emerald-600' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-slate-600/10 dark:bg-slate-600/20 flex items-center justify-center">
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400">System configuration and management modules</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Module Selection Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-white dark:bg-dark-800 shadow-sm text-slate-900 dark:text-white border border-slate-200 dark:border-dark-700/50" 
                  : "text-slate-500 dark:text-dark-500 hover:text-slate-700 dark:hover:text-dark-300 hover:bg-slate-50 dark:hover:bg-dark-800/30"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                activeTab === tab.id ? `${tab.color} text-white shadow-lg` : "bg-slate-100 dark:bg-dark-900"
              )}>
                <tab.icon className="w-4 h-4" />
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full animate-slide-up">
          {activeTab === 'general' ? (
            <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50">
              <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-primary-500/5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="font-bold text-slate-900 dark:text-white">Financial Record Setup</h2>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="label mb-2 block">Software Starting Date</label>
                  <input 
                    type="date" 
                    className="input w-full md:w-64" 
                    value={settings.startDate} 
                    onChange={handleUpdateStartDate}
                  />
                  <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-4 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold mb-1">Important System Notice</p>
                      <p className="text-xs leading-relaxed opacity-80">
                        Setting a start date will filter out all transactions and ledger entries recorded before this threshold across all modules. 
                        This is useful for starting a new cycle or arching historical data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* User List Module */}
              <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50">
                <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-emerald-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="font-bold text-slate-900 dark:text-white">Registered System Users</h2>
                  </div>
                  <button 
                    onClick={() => setShowUserForm(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register New
                  </button>
                </div>
                <div className="p-0">
                  {settings.users.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-400 italic">No additional users registered</div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-dark-700/50">
                      {settings.users.map((user) => (
                        <div key={user.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-700 flex items-center justify-center text-slate-600 dark:text-dark-300 font-black">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                <span className={cn(
                                  "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider",
                                  user.role === 'Admin' ? "bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400" : "bg-slate-100 text-slate-500 dark:bg-dark-700 dark:text-dark-400"
                                )}>
                                  {user.role}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium font-mono">{user.email}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => { deleteUser(user.id); toast('User deleted', 'warning'); }}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              user.id === 'master-001' ? "opacity-10 cursor-not-allowed" : "text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
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
          )}
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
