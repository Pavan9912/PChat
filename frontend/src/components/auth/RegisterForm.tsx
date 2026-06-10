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

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSendOtp = async () => {
    setLocalError(null);

    if (!name || !username || !email || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch(`${apiHost}/api/auth/register-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }

      setOtpSent(true);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send verification code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!otpSent) {
      await handleSendOtp();
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setLocalError('Please enter a valid 6-digit verification code');
      return;
    }

    const payload = { name, username, email, password, confirmPassword, otp };

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
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          {otpSent ? 'Verify Email' : 'Create Account'}
        </h2>
        <p className="text-sm text-dark-secondary">
          {otpSent ? 'Confirm the code sent to your inbox' : 'Join PChatNow to start messaging instantly.'}
        </p>
      </div>

      {(error || localError) && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{localError || error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {!otpSent ? (
          <>
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

            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
                placeholder="name@example.com"
              />
            </div>

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
              disabled={isSendingOtp}
              className="w-full py-3 mt-4 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Send Verification Code'}
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-4 bg-dark-input border border-neutral-800/60 p-4 rounded-xl">
              <p className="text-xs text-dark-secondary mb-1">We sent a 6-digit code to</p>
              <p className="text-sm font-semibold text-white break-all">{email}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2 text-center">
                Enter Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-4 py-3 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-center text-xl tracking-[8px] font-bold"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Verify & Create Account'}
            </button>

            <div className="flex justify-between items-center mt-6 text-xs text-dark-secondary px-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="hover:text-white transition-colors"
              >
                {isSendingOtp ? 'Sending...' : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="hover:text-white transition-colors font-semibold"
              >
                Go Back & Edit Info
              </button>
            </div>
          </>
        )}
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
