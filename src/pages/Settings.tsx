import { useState } from 'react';
import { Settings, ShieldCheck, AlertCircle, Calendar, UserCog } from 'lucide-react';
import { useStore } from '../store/useStore';
import ManageUsersModal from '../components/modals/ManageUsersModal';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { settings, updateSettings, currentUser } = useStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
  const [showManageUsers, setShowManageUsers] = useState(false);
  
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
    <div className="animate-fade-in space-y-6 h-full">
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

      <div className="flex flex-col md:flex-row gap-6 items-start h-[calc(100vh-220px)]">
        {/* Module Selection Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1.5 font-bold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 border",
                activeTab === tab.id 
                  ? "bg-white dark:bg-dark-900 shadow-sm text-slate-900 dark:text-white border-slate-200 dark:border-dark-700/50" 
                  : "text-slate-500 dark:text-dark-500 hover:text-slate-700 dark:hover:text-dark-300 hover:bg-slate-50 dark:hover:bg-dark-800/30 border-transparent"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                activeTab === tab.id ? `${tab.color} text-white shadow-lg` : "bg-slate-100 dark:bg-dark-810"
              )}>
                <tab.icon className="w-4 h-4" />
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full animate-slide-up h-full">
          {activeTab === 'general' ? (
            <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50 h-full">
              <div className="p-5 border-b border-slate-200 dark:border-dark-700/50 bg-primary-500/5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="font-bold text-slate-900 dark:text-white">Financial Record Setup</h2>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div>
                  <label className="label mb-3 block text-sm font-black uppercase tracking-widest text-slate-400">Software Starting Date</label>
                  <input 
                    type="date" 
                    className="input w-full md:w-80 !py-3 !text-lg !font-bold" 
                    value={settings.startDate} 
                    onChange={handleUpdateStartDate}
                  />
                  <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-5 text-amber-700 dark:text-amber-400 shadow-sm shadow-amber-500/5">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                       <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-base font-black mb-1 uppercase tracking-tighter">Important System Notice</p>
                      <p className="text-sm leading-relaxed opacity-80 font-medium">
                        Setting a start date will filter out all transactions and ledger entries recorded before this threshold across all modules. 
                        This is critical for starting a new financial cycle or clearing historical data from focus.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden border border-slate-200/50 dark:border-dark-700/50 h-full flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 rounded-3xl bg-emerald-600/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
               </div>
               <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Login Access Control</h2>
               <p className="text-slate-500 dark:text-dark-400 max-w-md mx-auto mb-8 font-medium">
                 Manage who has access to your business data. Create new staff accounts, 
                 update passwords, or modify administrative privileges.
               </p>
               <button 
                  onClick={() => setShowManageUsers(true)}
                  className="btn-primary flex items-center gap-2 !px-12 !py-4 text-base font-black shadow-2xl shadow-emerald-600/20"
               >
                  <UserCog className="w-5 h-5" /> Manage System Users
               </button>
               
               <div className="mt-12 flex gap-8">
                  <div className="text-center">
                     <p className="text-2xl font-black text-slate-900 dark:text-white">{settings.users.length}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Users</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-dark-700"></div>
                  <div className="text-center">
                     <p className="text-2xl font-black text-emerald-600 uppercase">Online</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Status</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <ManageUsersModal
        isOpen={showManageUsers}
        onClose={() => setShowManageUsers(false)}
      />
    </div>
  );
}
