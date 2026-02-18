import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, Loader2, Leaf, PenLine } from 'lucide-react';
import { authAPI } from '../services/api';
import { User } from '../types';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

type AuthMode = 'login' | 'signup';

const REFERRAL_OPTIONS = [
  'Search Engine',
  'Social Media',
  'Friend/Colleague',
  'Blog/Article',
  'Product Hunt',
  'Other',
];

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [referralSource, setReferralSource] = useState('');

  const validate = (): string | null => {
    if (mode === 'signup') {
      if (!name.trim()) return 'Name is required';
      if (!email.trim()) return 'Email is required';
      if (!password) return 'Password is required';
      if (password.length < 8) return 'Password must be at least 8 characters';
      if (password !== passwordConfirm) return 'Passwords do not match';
    } else {
      if (!email.trim()) return 'Email is required';
      if (!password) return 'Password is required';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await authAPI.register({
          name: name.trim(),
          email: email.trim(),
          password,
          password_confirm: passwordConfirm,
          job_role: jobRole.trim() || undefined,
          referral_source: referralSource || undefined,
        });
        onAuthSuccess(res.user);
      } else {
        const res = await authAPI.login({
          email: email.trim(),
          password,
        });
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  const inputClass = "w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent border-b-2 border-amber-300/70 text-gray-900 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-all font-hand text-base sm:text-lg";

  const labelClass = "block text-xs sm:text-sm font-semibold text-stone-700 mb-0.5 sm:mb-1 tracking-wide uppercase";

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FDFBF7] flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:py-8 relative overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none opacity-[0.3]"
           style={{ backgroundImage: 'radial-gradient(#D4C9A8 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="fixed top-4 left-4 sm:top-8 sm:left-8 pointer-events-none select-none hidden sm:block">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FFD6E0] rounded-sm shadow-md transform -rotate-6 flex items-center justify-center"
             style={{ clipPath: 'polygon(0 5%, 100% 0, 100% 100%, 0% 95%)' }}>
          <PenLine className="text-rose-400 w-6 h-6 sm:w-8 sm:h-8 opacity-60" />
        </div>
      </div>

      <div className="fixed bottom-8 right-8 pointer-events-none select-none hidden sm:block">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D4F5E0] rounded-sm shadow-md transform rotate-6 flex items-center justify-center"
             style={{ clipPath: 'polygon(0 0, 100% 5%, 100% 95%, 0% 100%)' }}>
          <Leaf className="text-emerald-500 w-6 h-6 sm:w-8 sm:h-8 opacity-60" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex flex-col items-center">
        <div className="flex flex-col items-center mb-4 sm:mb-6 shrink-0">
          <div className="w-11 h-11 sm:w-14 sm:h-14 bg-[#2C2C2C] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg mb-2 sm:mb-3">
            <Sparkles className="text-amber-200 w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-gray-900">Insparkie</h1>
          <p className="font-hand text-sm sm:text-lg text-stone-600 mt-0.5">
            {mode === 'signup' ? 'Plant your first idea today' : 'Welcome back, gardener'}
          </p>
        </div>

        <div className="w-full relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-amber-300/70 rounded-sm shadow-sm z-20" />
          <div className="absolute -top-2 left-[30%] -translate-x-1/2 w-6 h-3.5 bg-amber-200/60 rounded-sm shadow-sm z-20 hidden sm:block" />
          <div className="absolute -top-2 left-[70%] -translate-x-1/2 w-6 h-3.5 bg-amber-200/60 rounded-sm shadow-sm z-20 hidden sm:block" />

          <div className="relative bg-[#FFFEF9] rounded-md shadow-[0_2px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)] border border-amber-100/60 p-5 sm:p-7 pt-6 sm:pt-8"
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #E8DCC8 27px, #E8DCC8 28px)',
                 backgroundPosition: '0 60px',
               }}>

            <div className="absolute left-8 sm:left-10 top-0 bottom-0 w-px bg-rose-200/40 pointer-events-none" />

            <div className="flex bg-amber-50/80 p-0.5 sm:p-1 rounded-lg mb-4 sm:mb-5 border border-amber-100/50">
              <button
                onClick={() => { setMode('signup'); setError(''); }}
                className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'signup' ? 'bg-white shadow-sm text-gray-900 border border-amber-100/60' : 'text-stone-600 hover:text-stone-800'}`}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${mode === 'login' ? 'bg-white shadow-sm text-gray-900 border border-amber-100/60' : 'text-stone-600 hover:text-stone-800'}`}
              >
                Log In
              </button>
            </div>

            {error && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50/80 border border-red-200/60 rounded-lg text-red-600 text-xs sm:text-sm font-hand">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className={labelClass}>Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className={labelClass}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                    placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <>
                  <div>
                    <label className={labelClass}>Confirm Password *</label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className={inputClass}
                      placeholder="Re-enter password"
                    />
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-dashed border-amber-200/60">
                    <label className={labelClass}>Job / Role <span className="text-stone-500 normal-case">(optional)</span></label>
                    <input
                      type="text"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Product Manager, Designer"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>How did you find us? <span className="text-stone-500 normal-case">(optional)</span></label>
                    <select
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="">Select...</option>
                      {REFERRAL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 bg-[#2C2C2C] text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-[#1a1a1a] transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-3 sm:mt-4 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : mode === 'signup' ? (
                  <>
                    <Leaf size={16} />
                    Plant My Account
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <p className="text-center text-xs sm:text-sm text-stone-600 mt-4 sm:mt-5 font-hand">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button onClick={switchMode} className="text-amber-800 font-bold hover:underline underline-offset-2">
                {mode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </div>

          <div className="absolute -bottom-1 left-2 right-2 h-2 bg-amber-50/40 rounded-b-md -z-10 border-x border-b border-amber-100/30" />
          <div className="absolute -bottom-2.5 left-4 right-4 h-2 bg-amber-50/20 rounded-b-md -z-20 border-x border-b border-amber-100/20" />
        </div>

        <p className="text-center text-[10px] sm:text-xs text-stone-500 mt-4 sm:mt-6 font-hand">
          Your ideas stay private & secure
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
