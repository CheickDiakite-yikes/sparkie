import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.4]"
           style={{ backgroundImage: 'radial-gradient(#E5E5E5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Sparkles className="text-white w-7 h-7" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-gray-900">SparkGarden</h1>
          <p className="font-hand text-lg text-stone-500 mt-1">
            {mode === 'signup' ? 'Plant your first idea today' : 'Welcome back, gardener'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-8">
          <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Sign Up
            </button>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Log In
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-gray-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-stone-300 transition-all"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-gray-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-stone-300 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-gray-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-stone-300 transition-all pr-12"
                  placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-gray-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-stone-300 transition-all"
                    placeholder="Re-enter password"
                  />
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <label className="block text-sm font-medium text-stone-600 mb-1">Job / Role <span className="text-stone-400">(optional)</span></label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-gray-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-stone-300 transition-all"
                    placeholder="e.g. Product Manager, Designer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">How did you find us? <span className="text-stone-400">(optional)</span></label>
                  <select
                    value={referralSource}
                    onChange={(e) => setReferralSource(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-stone-300 transition-all"
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
              className="w-full py-3.5 bg-black text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : mode === 'signup' ? (
                'Create Account'
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={switchMode} className="text-black font-semibold hover:underline">
              {mode === 'signup' ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
