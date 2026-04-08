import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, ArrowRight, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/Toast';
import loginBg from '../assets/login-bg.jpg';

export default function Login() {
  const { settings, login } = useStore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('ebs_remembered_email');
    const savedPass  = localStorage.getItem('ebs_remembered_password');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    if (savedPass) {
      setPassword(savedPass);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find user with matching email and password
    const user = (settings.users || []).find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password
    ) || (
      email.toLowerCase() === 'master@gmail.com' && password === 'master' 
        ? { id: 'master-001', name: 'Master Admin', email: 'master@gmail.com', password: 'master', role: 'Admin', createdAt: new Date().toISOString() } 
        : email.toLowerCase() === 'mubashirabbasedu12@gmail.com' && password === 'mubashir@2026'
        ? { id: 'dev-001', name: 'Mubashir Abbas', email: 'mubashirabbasedu12@gmail.com', password: 'mubashir@2026', role: 'Developer', createdAt: new Date().toISOString() }
        : null
    );

    if (!user) {
      toast('Invalid email or password', 'error');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('ebs_remembered_email', email);
      localStorage.setItem('ebs_remembered_password', password);
    } else {
      localStorage.removeItem('ebs_remembered_email');
      localStorage.removeItem('ebs_remembered_password');
    }

    login(user);
    toast(`Welcome back, ${user.name}!`, 'success');
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative font-sans"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Lighter, high-end overlay for iPhone-style contrast */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="flex flex-col items-center justify-center gap-3 mb-2">
            <div className="flex items-center gap-4">
              <div className="w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center shadow-xl p-1 border border-slate-200">
                 <img src="/assets/logo-hr.png" alt="HR" className="w-full h-full object-contain" />
              </div>
              <div className="w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center shadow-xl p-1 border border-slate-200">
                 <img src="/assets/logo-go.png" alt="GO" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-4xl whitespace-nowrap font-black text-slate-900 tracking-tighter text-center leading-none mt-2">
              HAMMAD RAHIM FILLING STATION
            </h1>
          </div>
          <p className="text-slate-600 text-[10px] uppercase tracking-[0.4em] font-black">Authorized Personnel Only</p>
        </div>

        {/* High-Contrast Professional Card */}
        <div className="bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[48px] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.1)] ring-1 ring-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-black block px-1">Login Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input 
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-white/40 border border-slate-200/50 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-sm placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-black block px-1">Access Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input 
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/40 border border-slate-200/50 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-sm shadow-sm placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Auth Options Row */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-slate-900 border-slate-900' : 'border-slate-300 hover:border-slate-400'}`}>
                  {rememberMe && <ShieldCheck className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[10px] font-black text-black uppercase tracking-widest group-hover:underline transition-colors">Remember Me</span>
              </div>

              <button 
                type="button"
                onClick={() => toast('Please contact master admin for password reset.', 'info')}
                className="text-[10px] font-black text-black uppercase tracking-widest hover:underline transition-all"
              >
                Forgot Password
              </button>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl transition-all shadow-2xl hover:bg-black flex items-center justify-center gap-2 group active:scale-[0.97] mt-4"
            >
              Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex flex-col items-center justify-center gap-2 text-[9px] font-black text-black uppercase tracking-widest pt-6 border-t border-slate-200/50">
               <p className="mt-2 text-center leading-loose">
                 All Rights Reserved @2026<br/>
                 Software Solution by <span className="font-black text-black">Mb Soft</span> – <span className="text-black font-black">03041654629</span>
               </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
