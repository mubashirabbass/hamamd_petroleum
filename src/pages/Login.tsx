import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, ArrowRight, Lock, Flame, Eye, EyeOff, User as UserIcon, Calendar, Undo2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/Toast';
import loginBg from '../assets/login-bg-whatsapp.jpeg';
import hrLogo from '../assets/hr-logo.png';

export default function Login() {
  const { settings, login, updateUser } = useStore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginSplash, setShowLoginSplash] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [typingFinished, setTypingFinished] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCnic, setResetCnic] = useState('');
  const [resetDob, setResetDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fullText = "حماد   رحیم   فلنگ   اسٹیشن   مینجمنٹ   سسٹم";

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) {
        clearInterval(timer);
        setTypingFinished(true);
      }
    }, 40);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (!showLoginSplash) {
      setSplashProgress(0);
      return;
    }

    const steps = [10, 30, 50, 70, 100];
    const timers = steps.map((value, index) =>
      window.setTimeout(() => setSplashProgress(value), (index + 1) * 200)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [showLoginSplash]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    
    // Find user with matching email and password
    const user = (settings.users || []).find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password
    ) || (
      email.toLowerCase() === 'master@gmail.com' && password === 'master' 
        ? { id: 'master-001', name: 'Master Admin', email: 'master@gmail.com', password: 'master', role: 'Admin', createdAt: new Date().toISOString(), cnic: '00000-0000000-0', dob: '2000-01-01' } 
        : email.toLowerCase() === 'mubashirabbasedu12@gmail.com' && password === 'mubashir@2026'
        ? { id: 'dev-001', name: 'Mubashir Abbas', email: 'mubashirabbasedu12@gmail.com', password: 'mubashir@2026', role: 'Developer', createdAt: new Date().toISOString(), cnic: '00000-0000000-0', dob: '2000-01-01' }
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
    setSplashProgress(0);
    // Run login animation first, then complete sign-in.
    window.setTimeout(() => {
      login(user);
      // Always land on dashboard after successful login.
      window.history.replaceState({}, '', '/');
      toast(`Welcome back, ${user.name}!`, 'success');
      setIsLoggingIn(false);
      setShowLoginSplash(false);
    }, 1150);
  };

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetEmail.toLowerCase() === 'master@gmail.com' || resetEmail.toLowerCase() === 'mubashirabbasedu12@gmail.com') {
      toast('Built-in admin accounts cannot be reset here.', 'error');
      return;
    }
    
    const user = (settings.users || []).find(u => 
      u.email.toLowerCase() === resetEmail.toLowerCase() &&
      u.cnic === resetCnic &&
      u.dob === resetDob
    );

    if (!user) {
      toast('Invalid details. No matching account found.', 'error');
      return;
    }

    setVerifiedUserId(user.id);
    toast('Identity verified. Please enter a new password.', 'success');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedUserId) return;

    try {
      await updateUser(verifiedUserId, { password: newPassword });
      toast('Password updated securely. You can now log in.', 'success');
      setShowForgotPassword(false);
      setVerifiedUserId(null);
      setEmail(resetEmail);
      setPassword('');
      setResetEmail('');
      setResetCnic('');
      setResetDob('');
      setNewPassword('');
    } catch (err) {
      toast('Failed to update password.', 'error');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-6 font-sans overflow-hidden">
      {/* ── Fixed Background Layer (Sharp) ──────────────────────────────────── */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed z-0"
        style={{
          backgroundImage: `url(${loginBg})`,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {showLoginSplash && (
        <div
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(2,6,23,0.72), rgba(2,6,23,0.72)), url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 backdrop-blur-[3px]" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-7">
              <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-white/10" />
              <div className="w-32 h-32 rounded-full bg-white/12 border border-white/25 shadow-2xl p-4 flex items-center justify-center">
                <img src={hrLogo} alt="HR Logo" className="w-full h-full object-contain login-logo-spin-cw" />
              </div>
            </div>
            <p className="text-white text-sm font-black uppercase tracking-[0.25em] mb-5">Signing In</p>
            <p className="text-white/70 text-[10px] uppercase tracking-[0.22em] mb-4">Loading Secure Workspace</p>
            <div className="w-56 h-1.5 rounded-full bg-white/15 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-cyan-300 via-white to-cyan-300"
                style={{ width: `${splashProgress}%`, transition: 'width 180ms ease-out' }}
              />
            </div>
            <p className="text-white/80 text-[10px] font-black tracking-widest mb-2">{splashProgress}%</p>
            <div className="windows-loader-dots" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {/* ── Main Login Content ────────────────────────────────────────────────── */}
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
              <h1 className={`login-brand-heading text-xl sm:text-2xl md:text-3xl font-black transition-all duration-1000 font-urdu pt-4 min-h-[80px] leading-[1.8] text-center px-6 py-3 rounded-2xl soft-glass !bg-white/[0.12] text-white whitespace-nowrap ${typingFinished ? 'animate-glow-soft' : ''}`}>
                {displayText}
              </h1>
              <p className="text-white/90 text-[12px] sm:text-[13px] font-urdu px-4 py-1.5 soft-glass rounded-full !bg-white/[0.08] mt-1">
                مظفر گڑھ روڈ، اڈا گھیل پور، ضلع جھنگ
              </p>
              <div className="login-brand-fire flex items-center gap-2 text-amber-300">
                <Flame className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
                <Flame className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                <Flame className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
              </div>
            </div>
          </div>
        </div>

        {/* ── High-Contrast Professional Card with Blur Buffer ────────────────── */}
        <div className="glass-container premium-glass-card rounded-[40px] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.6)] !bg-white/[0.08]">
          {/* The "Direct" Blur Layer (Works on all systems) */}
          <div 
            className="blur-buffer opacity-100" 
            style={{ backgroundImage: `url(${loginBg})` }} 
          />
          
          {/* subtle shine effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          
          {showForgotPassword ? (
            verifiedUserId ? (
              <form onSubmit={handleResetPassword} className="space-y-4 relative z-10 animate-fade-in">
                <div className="flex flex-col items-center mb-4">
                  <p className="text-emerald-400 text-[9px] uppercase tracking-[0.25em] font-black bg-emerald-400/10 backdrop-blur-sm px-4 py-1 rounded-full border border-emerald-400/20 shadow-sm">
                    Identity Verified
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white block px-1">Set New Password</label>
                  <div className="relative group">
                    <input type={showNewPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl py-3.5 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-white/10 text-sm placeholder:text-white/30" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-white opacity-100 z-20 pointer-events-none" strokeWidth={2.5} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 !text-white opacity-100 z-20 focus:outline-none">
                      {showNewPassword ? <EyeOff className="w-4 h-4" strokeWidth={2.5} /> : <Eye className="w-4 h-4" strokeWidth={2.5} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setVerifiedUserId(null)} className="w-[80px] bg-white/10 text-white font-black py-4 rounded-2xl hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0">
                    <Undo2 className="w-5 h-5" />
                  </button>
                  <button type="submit" className="flex-1 bg-emerald-600/90 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-600 flex items-center justify-center gap-2 group transition-all">
                    Update Password <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyIdentity} className="space-y-4 relative z-10 animate-fade-in">
                <div className="flex flex-col items-center mb-4">
                  <p className="text-amber-400 text-[9px] uppercase tracking-[0.25em] font-black bg-amber-400/10 backdrop-blur-sm px-4 py-1 rounded-full border border-amber-400/20 shadow-sm">
                    Verify Identity
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white block px-1">Registered Email</label>
                  <div className="relative group">
                    <input type="email" placeholder="name@example.com" className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-white/10 text-sm placeholder:text-white/30" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-white opacity-100 z-20 pointer-events-none" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white block px-1">CNIC</label>
                  <div className="relative group">
                    <input type="text" placeholder="e.g. 12345-1234567-1" className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-white/10 text-sm placeholder:text-white/30" value={resetCnic} onChange={(e) => setResetCnic(e.target.value)} required />
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-white opacity-100 z-20 pointer-events-none" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white block px-1">Date of Birth</label>
                  <div className="relative group">
                    <input type="date" className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-white/10 text-sm" value={resetDob} onChange={(e) => setResetDob(e.target.value)} required />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-white opacity-100 z-20 pointer-events-none" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForgotPassword(false)} className="w-[80px] bg-white/10 text-white font-black py-4 rounded-2xl hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0">
                    <Undo2 className="w-5 h-5" />
                  </button>
                  <button type="submit" className="flex-1 bg-amber-500/90 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-amber-500 flex items-center justify-center gap-2 group transition-all">
                    Verify Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-5 relative z-10 animate-fade-in">
            <div className="space-y-3">
              <div className="flex flex-col items-center mb-1">
                <p className="text-white/95 text-[9px] uppercase tracking-[0.25em] font-black bg-white/10 backdrop-blur-sm px-4 py-1 rounded-full border border-white/20 shadow-sm">
                  Authorized Personnel Only
                </p>
              </div>
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white block px-1">Login Email</label>
              <div className="relative group">
                <input 
                  type="email"
                  placeholder="name@example.com"
                  className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-4 focus:ring-white/10 transition-all text-sm placeholder:text-white/30"
                  style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-white opacity-100 z-20 pointer-events-none" strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-white block px-1">Access Password</label>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl py-3.5 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-4 focus:ring-white/10 transition-all text-sm shadow-sm placeholder:text-white/30"
                  style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 !text-white opacity-100 z-20 pointer-events-none" strokeWidth={2.5} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 !text-white opacity-100 z-20 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={2.5} /> : <Eye className="w-4 h-4" strokeWidth={2.5} />}
                </button>
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
                onClick={() => setShowForgotPassword(true)}
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

            <div className="flex flex-col items-center justify-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest pt-5 border-t border-white/20">
               <div className="mt-4 text-center leading-relaxed bg-black/60 border border-white/20 rounded-2xl px-6 py-4 shadow-2xl">
                 <p className="text-white text-[9px] font-bold uppercase tracking-wider mb-1 opacity-80">All Rights Reserved @2026</p>
                 <p className="text-white text-[11px] font-black uppercase tracking-widest">
                   Software Solution by Mb Soft
                 </p>
                 <p className="text-white text-[12px] font-black mt-2 tracking-[0.2em]">03041654629</p>
               </div>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
