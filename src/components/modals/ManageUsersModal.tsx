import React, { useState } from 'react';
import {
  Plus, Trash2, Edit2, Check, X, Shield, Key, User as UserIcon,
  Eye, EyeOff, ChevronDown, ChevronUp, Crown, Users, Lock, Save, Calendar
} from 'lucide-react';
import { useStore, User } from '../../store/useStore';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

// ── Role badge colours ──────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, string> = {
  Developer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Admin:     'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
  Staff:     'bg-slate-100  text-slate-600  dark:bg-dark-800      dark:text-dark-400',
};

const ROLE_ICON: Record<string, React.ReactNode> = {
  Developer: <Crown className="w-3 h-3" />,
  Admin:     <Shield className="w-3 h-3" />,
  Staff:     <UserIcon className="w-3 h-3" />,
};

// ── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ user }: { user: User }) {
  const colors: Record<string, string> = {
    Developer: 'bg-purple-600 shadow-purple-500/20',
    Admin:     'bg-amber-500  shadow-amber-400/20',
    Staff:     'bg-slate-500  shadow-slate-400/20',
  };
  return (
    <div className={cn(
      'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-lg flex-shrink-0',
      colors[user.role] ?? 'bg-slate-500'
    )}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function LoginManagementPanel() {
  const { settings, addUser, updateUser, deleteUser, currentUser } = useStore();
  const { toast } = useToast();

  const isAdmin     = currentUser?.role === 'Admin';
  const isDeveloper = currentUser?.role === 'Developer';
  const canManage   = isAdmin || isDeveloper;

  // ── Add Form State ────────────────────────────────────────────────────────
  const [showAdd, setShowAdd]     = useState(false);
  const [showAddPw, setShowAddPw] = useState(false);
  const [newUser, setNewUser]     = useState({
    name: '', email: '', password: '',
    role: 'Admin' as 'Admin' | 'Staff' | 'Developer',
    cnic: '', dob: ''
  });

  // ── Edit State ─────────────────────────────────────────────────────────────
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editForm,  setEditForm]      = useState<Partial<User>>({});
  const [showEditPw, setShowEditPw]   = useState(false);

  // ── View password per card ─────────────────────────────────────────────────
  const [shownPwIds, setShownPwIds] = useState<Set<string>>(new Set());
  const togglePw = (id: string) =>
    setShownPwIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Self-password change ───────────────────────────────────────────────────
  const [showSelfPw,    setShowSelfPw]    = useState(false);
  const [selfNewPw,     setSelfNewPw]     = useState('');
  const [selfConfirmPw, setSelfConfirmPw] = useState('');
  const [showSelfPwVis, setShowSelfPwVis] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast('All fields are required', 'error'); return;
    }
    if (settings.users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      toast('A user with this email already exists', 'error'); return;
    }
    await addUser(newUser);
    setNewUser({ name: '', email: '', password: '', role: 'Admin', cnic: '', dob: '' });
    setShowAdd(false);
    setShowAddPw(false);
    toast('User account created successfully', 'success');
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({ 
      name: user.name, 
      email: user.email, 
      password: user.password, 
      role: user.role,
      cnic: user.cnic,
      dob: user.dob
    });
    setShowEditPw(false);
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name?.trim() || !editForm.email?.trim()) {
      toast('Name and email are required', 'error'); return;
    }
    await updateUser(id, editForm);
    setEditingId(null);
    toast('User updated successfully', 'success');
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Permanently delete "${user.name}"? This cannot be undone.`)) return;
    await deleteUser(user.id);
    toast('User account deleted', 'success');
  };

  const handleSelfPwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfNewPw.trim()) { toast('Password cannot be empty', 'error'); return; }
    if (selfNewPw !== selfConfirmPw) { toast('Passwords do not match', 'error'); return; }
    if (!currentUser) return;
    await updateUser(currentUser.id, { password: selfNewPw.trim() });
    setSelfNewPw(''); setSelfConfirmPw('');
    setShowSelfPw(false);
    toast('Your password has been updated', 'success');
  };

  const users = settings.users;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header Stats ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-black text-slate-900 dark:text-white text-sm">{users.length} User{users.length !== 1 ? 's' : ''} Registered</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Access Control</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => { setShowAdd(!showAdd); setShowAddPw(false); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95',
              showAdd
                ? 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-400'
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
            )}
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? 'Cancel' : 'New User'}
          </button>
        )}
      </div>

      {/* ── Add New User Form ─────────────────────────────────────────────── */}
      {showAdd && canManage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Create New Login Account
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {/* Name */}
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 w-full"
                  placeholder="Full Name *"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  dir="auto"
                />
              </div>
              {/* Email */}
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 w-full"
                  placeholder="Email / Username *"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 !pr-10 w-full"
                  type={showAddPw ? 'text' : 'password'}
                  placeholder="Password *"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowAddPw(!showAddPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showAddPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Role */}
              <select
                className="input w-full"
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
              >
                <option value="Admin">Admin — Full Access</option>
                <option value="Staff">Staff — Standard Access</option>
                {isDeveloper && <option value="Developer">Developer — System Access</option>}
              </select>

              {/* CNIC */}
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 w-full"
                  placeholder="CNIC (e.g. 12345-1234567-1)"
                  value={newUser.cnic}
                  onChange={e => setNewUser({ ...newUser, cnic: e.target.value })}
                />
              </div>

              {/* DOB */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  className="input !pl-10 w-full"
                  value={newUser.dob}
                  onChange={e => setNewUser({ ...newUser, dob: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">Birthday</span>
              </div>
            </div>
            <button type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Create Account
            </button>
          </form>
        </div>
      )}

      {/* ── Self Password Change (for current logged-in admin) ─────────────── */}
      {(isAdmin || isDeveloper) && currentUser && (
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-800 overflow-hidden">
          <button
            onClick={() => setShowSelfPw(!showSelfPw)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-600/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-800 dark:text-white">Change My Password</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logged in as: {currentUser.name}</p>
              </div>
            </div>
            {showSelfPw ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showSelfPw && (
            <form onSubmit={handleSelfPwChange} className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-dark-800 pt-4 animate-in slide-in-from-top-1 duration-150">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 !pr-10 w-full"
                  type={showSelfPwVis ? 'text' : 'password'}
                  placeholder="New Password"
                  value={selfNewPw}
                  onChange={e => setSelfNewPw(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowSelfPwVis(!showSelfPwVis)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showSelfPwVis ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input !pl-10 !pr-10 w-full"
                  type={showSelfPwVis ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={selfConfirmPw}
                  onChange={e => setSelfConfirmPw(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowSelfPw(false); setSelfNewPw(''); setSelfConfirmPw(''); }}
                  className="flex-1 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-[2] py-2.5 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all">
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── User Cards List ─────────────────────────────────────────────────── */}
      <div className="space-y-3 overflow-y-auto no-scrollbar pb-4">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-800">
            <Users className="w-12 h-12 text-slate-200 dark:text-dark-700 mb-3" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Users Registered</p>
          </div>
        ) : users.map((user) => {
          const isEditing = editingId === user.id;
          const isSelf    = user.id === currentUser?.id;
          const isMaster  = user.email === 'master@gmail.com';
          const pwVisible = shownPwIds.has(user.id);

          return (
            <div key={user.id}
              className={cn(
                'bg-white dark:bg-dark-900 rounded-2xl border shadow-sm overflow-hidden transition-all',
                isEditing
                  ? 'border-primary-400 dark:border-primary-600 shadow-primary-500/10'
                  : 'border-slate-200 dark:border-dark-800'
              )}>

              {/* ── View Mode ──────────────────────────────────────────────── */}
              {!isEditing ? (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-black text-slate-900 dark:text-white text-sm truncate">{user.name}</p>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider', ROLE_STYLE[user.role])}>
                          {ROLE_ICON[user.role]} {user.role}
                        </span>
                        {isSelf && <span className="text-[9px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full font-black uppercase">You</span>}
                        {isMaster && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full font-black uppercase">Master</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-dark-400 font-medium truncate">{user.email}</p>
                      
                      {/* CNIC & DOB Info */}
                      {(user.cnic || user.dob) && (
                        <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                          {user.cnic && <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> {user.cnic}</span>}
                          {user.dob && <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {user.dob}</span>}
                        </div>
                      )}

                      {/* Password row */}
                      <div className="flex items-center gap-2 mt-2">
                        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        <span className="text-[11px] font-mono text-slate-600 dark:text-dark-300 flex-1 min-w-0 truncate">
                          {pwVisible ? user.password : '•'.repeat(Math.min(user.password?.length ?? 8, 12))}
                        </span>
                        <button
                          onClick={() => togglePw(user.id)}
                          className="text-slate-400 hover:text-primary-500 transition-colors flex-shrink-0"
                          title={pwVisible ? 'Hide password' : 'Show password'}
                        >
                          {pwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-dark-800">
                      <button onClick={() => startEdit(user)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-dark-800 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      {!isMaster && !isSelf && (
                        <button onClick={() => handleDelete(user)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-dark-800 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Edit Mode ─────────────────────────────────────────────── */
                <div className="p-4 space-y-3">
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Edit2 className="w-3.5 h-3.5" /> Editing: {user.name}
                  </p>
                  {/* Name */}
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="input !pl-10 w-full !py-2.5"
                      value={editForm.name ?? ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Full Name"
                      dir="auto" />
                  </div>
                  {/* Email */}
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="input !pl-10 w-full !py-2.5"
                      value={editForm.email ?? ''}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email / Username" />
                  </div>
                  {/* Password */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="input !pl-10 !pr-10 w-full !py-2.5"
                      type={showEditPw ? 'text' : 'password'}
                      value={editForm.password ?? ''}
                      onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Password" />
                    <button type="button" onClick={() => setShowEditPw(!showEditPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showEditPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Role */}
                  {!isMaster && (
                    <select className="input w-full !py-2.5"
                      value={editForm.role ?? user.role}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}>
                      <option value="Admin">Admin — Full Access</option>
                      <option value="Staff">Staff — Standard Access</option>
                      {isDeveloper && <option value="Developer">Developer — System Access</option>}
                    </select>
                  )}

                  {/* Edit CNIC */}
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="input !pl-10 w-full !py-2.5"
                      value={editForm.cnic ?? ''}
                      onChange={e => setEditForm({ ...editForm, cnic: e.target.value })}
                      placeholder="CNIC" />
                  </div>

                  {/* Edit DOB */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="date" className="input !pl-10 w-full !py-2.5"
                      value={editForm.dob ?? ''}
                      onChange={e => setEditForm({ ...editForm, dob: e.target.value })} />
                  </div>
                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-dark-700 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-800 transition-all">
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(user.id)}
                      className="flex-[2] py-2.5 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Security Notice ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/20 flex-shrink-0">
        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
          <strong>Security Note:</strong> Master accounts cannot be deleted. Password changes take effect immediately. Keep credentials confidential.
        </p>
      </div>
    </div>
  );
}
