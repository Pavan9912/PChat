import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, AlertTriangle } from 'lucide-react';
import { authStart, authSuccess, authFailure, clearError } from '../../store/slices/authSlice';
import { RootState } from '../../store';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    const payload: any = { name, username, password, confirmPassword };
    if (signupMethod === 'email') {
      if (!email) {
        setLocalError('Email Address is required');
        return;
      }
      payload.email = email;
    } else {
      if (!phoneNumber) {
        setLocalError('Phone Number is required');
        return;
      }
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
        setLocalError('Please enter a valid phone number (e.g. +123456789)');
        return;
      }
      payload.phoneNumber = cleanPhone;
    }

    dispatch(authStart());
    try {
      const res = await fetch(`${apiHost}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      dispatch(authSuccess({ user: data, token: data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      dispatch(authFailure(err.message || 'Registration failed'));
    }
  };

  return (
    <div className="w-full max-w-md bg-dark-panel border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Create Account</h2>
        <p className="text-sm text-dark-secondary">Join PChat to start messaging instantly.</p>
      </div>

      {/* Signup Method Tabs */}
      <div className="flex border-b border-neutral-800 mb-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setSignupMethod('email'); setLocalError(null); }}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            signupMethod === 'email'
              ? 'border-dark-accent text-dark-accent'
              : 'border-transparent text-dark-secondary hover:text-white'
          }`}
        >
          Email Address
        </button>
        <button
          type="button"
          onClick={() => { setSignupMethod('phone'); setLocalError(null); }}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            signupMethod === 'phone'
              ? 'border-dark-accent text-dark-accent'
              : 'border-transparent text-dark-secondary hover:text-white'
          }`}
        >
          Phone Number
        </button>
      </div>

      {(error || localError) && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{localError || error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
            placeholder="johndoe12"
          />
        </div>

        {signupMethod === 'email' ? (
          <div>
            <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={signupMethod === 'email'}
              className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
              placeholder="name@example.com"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required={signupMethod === 'phone'}
              className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
              placeholder="+123456789"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 mt-4 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Sign Up'}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-dark-secondary">
        Already have an account?{' '}
        <button
          onClick={() => {
            dispatch(clearError());
            navigate('/login');
          }}
          className="font-bold text-dark-accent hover:underline"
        >
          Sign In
        </button>
      </p>
    </div>
  );
};
export default RegisterForm;
