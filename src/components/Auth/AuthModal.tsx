import React, { useState } from 'react';
import { Mail, Lock, User, Phone, X, ShieldCheck, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { registerUserAccount, loginUserAccount } from '../../services/firebase';
import { UserProfile } from '../../types';
import { NaviLink3DArrow } from '../Common/NaviLink3DArrow';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signup',
}) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        if (!phone.trim()) {
          throw new Error('Please enter your phone number');
        }
        if (!email.trim() || !password.trim()) {
          throw new Error('Please provide email and password');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        try {
          const profile = await registerUserAccount(name, phone, email, password);
          onAuthSuccess(profile);
          onClose();
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            try {
              const profile = await loginUserAccount(email, password);
              onAuthSuccess(profile);
              onClose();
              return;
            } catch (_loginErr) {
              setIsSignUp(false);
              throw new Error('This email is already registered. Please enter your password to sign in.');
            }
          } else {
            throw regErr;
          }
        }
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and password');
        }
        const profile = await loginUserAccount(email, password);
        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      let message = err.message || 'Authentication failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        setIsSignUp(false);
        message = 'This email is already registered. Please log in with your password.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <NaviLink3DArrow size="md" />
          <h2 className="mt-3 text-xl sm:text-2xl font-black text-white tracking-tight">
            {isSignUp ? 'Create NaviLink Account' : 'Welcome Back to NaviLink'}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {isSignUp
              ? 'Connect, track & navigate securely with friends'
              : 'Sign in to access your live friends map and radar'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    id="input-auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hassan Javed"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Phone Number with default Pakistan Code (+92) */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Phone Number (Pakistan +92)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-xs font-bold text-emerald-400 select-none">
                    <span>🇵🇰</span>
                    <span>+92</span>
                  </div>
                  <input
                    id="input-auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      let val = e.target.value;
                      // Strip +92 if user pastes it into the subfield
                      if (val.startsWith('+92')) val = val.slice(3);
                      if (val.startsWith('03')) val = val.slice(1);
                      setPhone(val);
                    }}
                    placeholder="300 1234567"
                    className="w-full pl-18 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-500 font-mono transition-all"
                    required
                  />
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Default country code is automatically set to Pakistan (+92)
                </p>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-zinc-500" />
              <input
                id="input-auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-zinc-500" />
              <input
                id="input-auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-white placeholder-zinc-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Device Location Automatic On Notice */}
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-300">
            <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Device live location is <strong>automatically ON by default</strong>. You can switch it OFF anytime in Privacy Settings.
            </span>
          </div>

          {/* Submit Button */}
          <button
            id="btn-auth-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to Firebase...</span>
              </>
            ) : isSignUp ? (
              <span>Create Account</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              id="btn-toggle-auth-mode"
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer ml-1"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </div>

        {/* Firebase 1-Read Efficiency Badge */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Secured by Firebase (1-Read Optimized & Instant Sync)</span>
        </div>
      </div>
    </div>
  );
};
