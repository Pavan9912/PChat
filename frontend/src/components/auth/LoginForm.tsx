import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Loader2, Chrome, Facebook, AlertTriangle } from 'lucide-react';
import { authStart, authSuccess, authFailure, clearError } from '../../store/slices/authSlice';
import { RootState } from '../../store';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleGoogleCredentialResponse = async (response: any) => {
    dispatch(authStart());
    try {
      const res = await fetch(`${apiHost}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Google authentication failed');
      }

      dispatch(authSuccess({ user: data, token: data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      dispatch(authFailure(err.message || 'Google authentication failed'));
    }
  };

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    const initializeGoogle = () => {
      if (window.google && googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        
        const btnContainer = document.getElementById('google-signin-button');
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'filled_dark',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: btnContainer.clientWidth || 180,
          });
        }
      }
    };

    initializeGoogle();
    
    const interval = setInterval(() => {
      if (window.google) {
        initializeGoogle();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [apiHost]);

  const handleSendOtp = async () => {
    if (!email) {
      setLocalError('Email address is required to send OTP');
      return;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
      setLocalError('Please enter a valid email address to send OTP');
      return;
    }

    setOtpLoading(true);
    setLocalError(null);
    setOtpSuccessMessage(null);
    try {
      const res = await fetch(`${apiHost}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      setOtpSent(true);
      setOtpSuccessMessage('Verification OTP sent to your email.');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (loginMode === 'otp') {
      if (!email) {
        setLocalError('Email address is required');
        return;
      }
      if (!otp) {
        setLocalError('Verification OTP is required');
        return;
      }
    } else {
      if (!email || !password) {
        setLocalError('Email/Phone and Password are required');
        return;
      }
    }

    dispatch(authStart());
    try {
      const payload: any = { email };
      if (loginMode === 'otp') {
        payload.otp = otp;
      } else {
        payload.password = password;
      }

      const res = await fetch(`${apiHost}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      {(error || localError) && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{localError || error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
            {loginMode === 'otp' ? 'Email Address' : 'Email or Phone Number'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
              placeholder={loginMode === 'otp' ? 'name@example.com' : 'name@example.com or +123456789'}
            />
            {loginMode === 'otp' && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || !email}
                className="px-4 bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold rounded-xl transition-all border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center min-w-[90px]"
              >
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (otpSent ? 'Resend' : 'Send OTP')}
              </button>
            )}
          </div>
          {loginMode === 'otp' && otpSuccessMessage && (
            <p className="mt-1.5 text-xs text-emerald-400 font-medium">{otpSuccessMessage}</p>
          )}
        </div>

        {loginMode === 'otp' ? (
          otpSent && (
            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                Verification Code (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-4 py-3 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm tracking-widest text-center font-mono text-lg"
                placeholder="000000"
              />
            </div>
          )
        ) : (
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
                required={loginMode === 'password'}
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
        )}

        <div className="flex justify-between items-center">
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
            type="button"
            onClick={() => {
              setLoginMode(loginMode === 'password' ? 'otp' : 'password');
              setLocalError(null);
              setOtp('');
              setOtpSent(false);
              setOtpSuccessMessage(null);
              dispatch(clearError());
            }}
            className="text-xs font-bold text-dark-accent hover:underline"
          >
            {loginMode === 'password' ? 'Sign In with Email OTP' : 'Sign In with Password'}
          </button>
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

      <div className="flex flex-col gap-4">
        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div className="w-full flex justify-center h-[44px]" id="google-signin-button"></div>
        ) : (
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
        )}
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
