import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenCode, setTokenCode] = useState<string | null>(null); // For local testing fallback

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setTokenCode(null);

    try {
      const res = await fetch(`${apiHost}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setSuccess('Reset instructions have been sent successfully.');
      if (data.resetToken) {
        setTokenCode(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit recovery request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-dark-panel border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/login')}
          className="p-2 rounded-lg bg-dark-input hover:bg-neutral-800 text-dark-secondary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-dark-secondary">Back to Login</span>
      </div>

      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Recover Password</h2>
        <p className="text-sm text-dark-secondary">Enter your email to receive recovery instructions.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <p className="text-xs text-slate-400">
            For local testing, the instructions and verification token have been printed in the server logs.
          </p>
        </div>
      )}

      {/* Local developer simulator box */}
      {tokenCode && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-neutral-800 flex flex-col gap-3">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Local Developer Shortcut:
          </div>
          <p className="text-xs text-dark-secondary">
            Since emails are simulated locally, click the button below to jump directly to the password reset form:
          </p>
          <button
            onClick={() => navigate(`/reset-password/${tokenCode}`)}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg border border-neutral-700 transition-colors"
          >
            Go to Reset Form
          </button>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
              placeholder="name@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  );
};
export default ForgotPassword;
