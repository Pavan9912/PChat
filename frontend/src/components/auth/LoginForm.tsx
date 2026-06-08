import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Loader2, Chrome, Facebook, AlertTriangle } from 'lucide-react';
import { authStart, authSuccess, authFailure, clearError } from '../../store/slices/authSlice';
import { RootState } from '../../store';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    dispatch(authStart());
    try {
      const res = await fetch(`${apiHost}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to authenticate');
      }

      dispatch(authSuccess({ user: data, token: data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      dispatch(authFailure(err.message || 'Login failed'));
    }
  };

  // Simulated Social Login flows
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    dispatch(authStart());
    const mockPayload = provider === 'google' 
      ? { name: 'Google User', email: 'googleuser@pchat.com', avatar: '', googleId: 'g-123456789' }
      : { name: 'Facebook Friend', email: 'fbuser@pchat.com', avatar: '', facebookId: 'fb-987654321' };

    try {
      const res = await fetch(`${apiHost}/api/auth/social-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Social login failed');
      }

      dispatch(authSuccess({ user: data, token: data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      dispatch(authFailure(err.message || 'Social authentication failed'));
    }
  };

  return (
    <div className="w-full max-w-md bg-dark-panel border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome Back</h2>
        <p className="text-sm text-dark-secondary">Please sign in to access your chat feed.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
            Email or Phone Number
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
            placeholder="name@example.com or +123456789"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                dispatch(clearError());
                navigate('/forgot-password');
              }}
              className="text-xs font-semibold text-dark-accent hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 pr-10 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-secondary hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 bg-dark-input border border-neutral-800 rounded accent-dark-accent focus:ring-0 focus:ring-offset-0"
          />
          <label htmlFor="remember-me" className="ml-2 text-xs text-dark-secondary cursor-pointer select-none">
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Sign In'}
        </button>
      </form>

      <div className="relative my-8 text-center">
        <hr className="border-neutral-800" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-dark-panel text-xs text-dark-secondary uppercase font-bold tracking-wider">
          Or Continue With
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          className="py-2.5 px-4 rounded-xl border border-neutral-800 bg-dark-input text-sm text-white font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Chrome className="w-4 h-4 text-red-400" />
          Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin('facebook')}
          className="py-2.5 px-4 rounded-xl border border-neutral-800 bg-dark-input text-sm text-white font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Facebook className="w-4 h-4 text-blue-500" />
          Facebook
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-dark-secondary">
        Don't have an account yet?{' '}
        <button
          onClick={() => {
            dispatch(clearError());
            navigate('/register');
          }}
          className="font-bold text-dark-accent hover:underline"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
};
export default LoginForm;
