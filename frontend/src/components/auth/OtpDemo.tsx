import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, KeyRound, CheckCircle2, XCircle, ArrowLeft, Clock, Database, Inbox } from 'lucide-react';

export const OtpDemo: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stepDetails, setStepDetails] = useState<string[]>([]);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSending(true);
    setStepDetails([
      'Validating email format...',
      'Connecting to server...',
    ]);

    try {
      const res = await fetch(`${apiHost}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP code');
      }

      setOtpSent(true);
      setSuccess('Verification code sent successfully! Check your email.');
      setStepDetails([
        '✅ Request accepted by backend.',
        '🔑 6-digit random OTP generated.',
        '💾 Saved in MongoDB (TTL set to 5 minutes).',
        '✉️ Sent via Gmail SMTP transport.',
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code');
      setStepDetails((prev) => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsVerifying(true);
    setStepDetails([
      'Validating 6-digit verification code...',
      'Submitting to verification endpoint...',
    ]);

    try {
      const res = await fetch(`${apiHost}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      setSuccess('OTP verified successfully!');
      setStepDetails([
        '✅ Request accepted by backend.',
        '🔍 OTP record located in database.',
        '🔒 Cryptographic match verified.',
        '🗑️ OTP record removed from MongoDB to prevent replay attacks.',
      ]);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setStepDetails((prev) => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setOtpSent(false);
    setEmail('');
    setOtp('');
    setError(null);
    setSuccess(null);
    setStepDetails([]);
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-dark-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-dark-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-dark-panel border border-neutral-800 p-8 rounded-2xl shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Form Column */}
        <div className="flex flex-col justify-between">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-xs font-semibold text-dark-secondary hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to App
            </button>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              OTP Verification
            </h2>
            <p className="text-sm text-dark-secondary mb-6 leading-relaxed">
              Experience generic OTP sending and validation using Gmail SMTP and MongoDB.
            </p>

            {/* Alerts */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-dark-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3 mt-4 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-dark-input/30 border border-neutral-800/60 p-4 rounded-xl mb-2">
                  <p className="text-xs text-dark-secondary mb-1">Code sent to</p>
                  <p className="text-sm font-semibold text-white break-all">{email}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                    Enter 6-Digit Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-dark-secondary" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-input border border-neutral-800 text-white rounded-xl focus:border-dark-accent focus:outline-none transition-colors text-sm text-center font-bold tracking-[6px]"
                      placeholder="000000"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-1/3 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center cursor-pointer text-sm"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-2/3 py-3 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 text-center text-xs text-dark-secondary">
            Need to register?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-bold text-dark-accent hover:underline"
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Technical Process Dashboard Column */}
        <div className="bg-dark-input/20 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-dark-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">System Logs & Activities</span>
            </div>

            <div className="space-y-3 font-mono text-[11px] leading-relaxed">
              {stepDetails.length === 0 ? (
                <div className="text-dark-secondary italic py-8 text-center">
                  Waiting for user action to trigger SMTP and DB pipelines...
                </div>
              ) : (
                stepDetails.map((detail, idx) => (
                  <div key={idx} className="text-neutral-300 border-l border-neutral-800 pl-3 py-0.5">
                    {detail}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-neutral-800/60 pt-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-dark-secondary">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Expires in: <strong>5 minutes (TTL DB)</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-dark-secondary">
              <Inbox className="w-3.5 h-3.5 shrink-0" />
              <span>SMTP Host: <strong>smtp.gmail.com</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default OtpDemo;
