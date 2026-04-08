import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, ArrowRight, Lock, Flame } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/Toast';
import loginBg from '../../Gemini_Generated_Image_haz9u6haz9u6haz9.png';
import hrLogo from '../../logo_not_png-removebg-preview.png';

export default function Login() {
  const { settings, login } = useStore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginSplash, setShowLoginSplash] = useState(false);

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
    if (isLoggingIn) return;
    
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

    setIsLoggingIn(true);
    setShowLoginSplash(true);
    // Run login animation first, then complete sign-in.
    window.setTimeout(() => {
      login(user);
      // Always land on dashboard after successful login.
      window.history.replaceState({}, '', '/');
      toast(`Welcome back, ${user.name}!`, 'success');
      setIsLoggingIn(false);
      setShowLoginSplash(false);
    }, 1000);
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative font-sans"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${loginBg})`
      }}
    >
      {showLoginSplash && (
        <div className="fixed inset-0 z-[999] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-3xl bg-white/10 border border-white/20 shadow-2xl p-3 mb-6">
            <img src={hrLogo} alt="HR Logo" className="w-full h-full object-contain login-logo-spin-cw" />
          </div>
          <p className="text-white text-sm font-black uppercase tracking-[0.25em] mb-5">Signing In</p>
          <div className="windows-loader-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="flex flex-col items-center justify-center gap-3 mb-2">
            <div className="flex items-center gap-4">
              <div className="w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center shadow-xl p-1 border border-slate-200">
                 <img src={hrLogo} alt="HR" className={`w-full h-full object-contain ${isLoggingIn ? 'login-logo-spin-cw' : ''}`} />
              </div>
              <div className="w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center shadow-xl p-1 border border-slate-200">
                 <img src="/assets/logo-go.png" alt="GO" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="mt-2 flex flex-col items-center gap-2">
              <h1 className="login-brand-heading text-4xl whitespace-nowrap font-black text-white tracking-tighter text-center leading-none px-4 py-2 rounded-2xl border border-white/40 bg-white/20 backdrop-blur-md">
                HAMMAD RAHIM FILLING STATION
              </h1>
              <div className="login-brand-fire flex items-center gap-2 text-amber-300">
                <Flame className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
                <Flame className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                <Flame className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
              </div>
            </div>
          </div>
          <p className="text-white/95 text-[10px] uppercase tracking-[0.4em] font-black bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/25 shadow-lg">
            Authorized Personnel Only
          </p>
        </div>

        {/* High-Contrast Professional Card */}
        <div className="bg-black/35 backdrop-blur-2xl border border-white/20 rounded-[48px] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/90 block px-1">Login Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                <input 
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-white/15 border border-white/30 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-4 focus:ring-white/20 transition-all text-sm placeholder:text-white/55"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white/90 block px-1">Access Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                <input 
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/15 border border-white/30 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-4 focus:ring-white/20 transition-all text-sm shadow-sm placeholder:text-white/55"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Auth Options Row */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-white border-white' : 'border-white/55 hover:border-white/85'}`}>
                  {rememberMe && <ShieldCheck className="w-3 h-3 text-slate-900" />}
                </div>
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest group-hover:underline transition-colors">Remember Me</span>
              </div>

              <button 
                type="button"
                onClick={() => toast('Please contact master admin for password reset.', 'info')}
                className="text-[10px] font-black text-white/90 uppercase tracking-widest hover:underline transition-all"
              >
                Forgot Password
              </button>
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl transition-all shadow-2xl hover:bg-black flex items-center justify-center gap-2 group active:scale-[0.97] mt-4"
            >
              {isLoggingIn ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex flex-col items-center justify-center gap-2 text-[9px] font-black text-white/85 uppercase tracking-widest pt-6 border-t border-white/20">
               <div className="mt-2 text-center leading-loose bg-white/10 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm shadow-sm">
                 <p>All Rights Reserved @2026</p>
                 <p>
                   Software Solution by <span className="font-black text-white">Mb Soft</span> - <span className="text-white font-black">03041654629</span>
                 </p>
               </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
