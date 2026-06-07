import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { updateUserSuccess } from '../../store/slices/authSlice';

interface ChatLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'set' | 'verify' | 'disable';
  onSuccess: (verifiedPin?: string) => void;
}

export const ChatLockModal: React.FC<ChatLockModalProps> = ({ isOpen, onClose, mode, onSuccess }) => {
  const dispatch = useDispatch();
  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [confirmDigits, setConfirmDigits] = useState<string[]>(['', '', '', '']);
  const [isConfirming, setIsConfirming] = useState(false); // Used in 'set' mode for confirmation step
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef0 = useRef<HTMLInputElement>(null);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);
  const inputRef3 = useRef<HTMLInputElement>(null);
  const inputRefs = [inputRef0, inputRef1, inputRef2, inputRef3];

  const confirmRef0 = useRef<HTMLInputElement>(null);
  const confirmRef1 = useRef<HTMLInputElement>(null);
  const confirmRef2 = useRef<HTMLInputElement>(null);
  const confirmRef3 = useRef<HTMLInputElement>(null);
  const confirmRefs = [confirmRef0, confirmRef1, confirmRef2, confirmRef3];

  // Auto-focus first input on mount or mode change
  useEffect(() => {
    if (isOpen) {
      resetState();
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen, mode]);

  const resetState = () => {
    setDigits(['', '', '', '']);
    setConfirmDigits(['', '', '', '']);
    setIsConfirming(false);
    setError(null);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const handleDigitChange = (
    index: number,
    value: string,
    isConfirmStep: boolean
  ) => {
    const lastChar = value.slice(-1);
    // Only allow numbers
    if (lastChar && !/^\d$/.test(lastChar)) return;

    const currentDigits = isConfirmStep ? confirmDigits : digits;
    const currentRefs = isConfirmStep ? confirmRefs : inputRefs;
    const setter = isConfirmStep ? setConfirmDigits : setDigits;

    const newDigits = [...currentDigits];
    newDigits[index] = lastChar;
    setter(newDigits);
    setError(null);

    // Auto-focus next input if a number is typed
    if (lastChar && index < 3) {
      currentRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    isConfirmStep: boolean
  ) => {
    const currentDigits = isConfirmStep ? confirmDigits : digits;
    const currentRefs = isConfirmStep ? confirmRefs : inputRefs;

    // Handle backspace to focus previous input
    if (e.key === 'Backspace' && !currentDigits[index] && index > 0) {
      currentRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const pin = digits.join('');
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'set') {
        if (!isConfirming) {
          // Move to confirmation step
          setIsConfirming(true);
          setTimeout(() => {
            confirmRefs[0].current?.focus();
          }, 100);
          setIsLoading(false);
          return;
        }

        const confirmPin = confirmDigits.join('');
        if (pin !== confirmPin) {
          setError('PINs do not match. Try again.');
          setConfirmDigits(['', '', '', '']);
          confirmRefs[0].current?.focus();
          setIsLoading(false);
          return;
        }

        // Call set PIN endpoint
        const res = await fetch(`${apiHost}/api/users/chat-lock/pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        // Update local user state
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.hasChatLockPin = true;
          dispatch(updateUserSuccess(userObj));
        }

        onSuccess(pin);
        onClose();
      } else if (mode === 'verify') {
        // Call verify PIN endpoint
        const res = await fetch(`${apiHost}/api/users/chat-lock/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid PIN');

        onSuccess(pin);
        onClose();
      } else if (mode === 'disable') {
        // Call remove PIN endpoint
        const res = await fetch(`${apiHost}/api/users/chat-lock/pin`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid PIN');

        // Update local user state
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.hasChatLockPin = false;
          dispatch(updateUserSuccess(userObj));
        }

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      if (isConfirming) {
        setConfirmDigits(['', '', '', '']);
        confirmRefs[0].current?.focus();
      } else {
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when all 4 digits are entered
  useEffect(() => {
    const pinFilled = digits.every((d) => d !== '');
    if (pinFilled && mode !== 'set') {
      handleSubmit();
    } else if (pinFilled && mode === 'set' && !isConfirming) {
      handleSubmit();
    }
  }, [digits]);

  useEffect(() => {
    const confirmFilled = confirmDigits.every((d) => d !== '');
    if (confirmFilled && isConfirming) {
      handleSubmit();
    }
  }, [confirmDigits]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-neutral-950 border border-neutral-900 shadow-2xl p-6 relative overflow-hidden select-none">
        
        {/* Glow Effects */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 hover:bg-neutral-900 rounded-lg text-dark-secondary hover:text-white transition-colors"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-12 h-12 bg-emerald-500/15 rounded-2xl flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/20">
            <ShieldCheck className="w-6.5 h-6.5" />
          </div>
          <h3 className="font-bold text-white text-lg">
            {mode === 'set'
              ? isConfirming
                ? 'Confirm Chat Lock PIN'
                : 'Create Chat Lock PIN'
              : mode === 'verify'
              ? 'Enter Chat Lock PIN'
              : 'Disable Chat Lock'}
          </h3>
          <p className="text-xs text-dark-secondary mt-1 px-4 leading-normal">
            {mode === 'set'
              ? isConfirming
                ? 'Re-enter your 4-digit PIN to confirm.'
                : 'Set a 4-digit PIN to lock private chats on this device.'
              : mode === 'verify'
              ? 'Enter your 4-digit PIN to unlock locked chats.'
              : 'Enter your 4-digit PIN to disable Chat Lock.'}
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PIN Input Grid */}
          <div className="flex justify-center gap-3">
            {!isConfirming
              ? digits.map((digit, idx) => (
                  <input
                    key={`pin-${idx}`}
                    ref={inputRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value, false)}
                    onKeyDown={(e) => handleKeyDown(idx, e, false)}
                    disabled={isLoading}
                    className="w-12 h-14 bg-dark-input text-center text-xl font-bold text-white rounded-xl border border-neutral-800 focus:border-dark-accent focus:outline-none transition-all shadow-inner"
                  />
                ))
              : confirmDigits.map((digit, idx) => (
                  <input
                    key={`confirm-${idx}`}
                    ref={confirmRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value, true)}
                    onKeyDown={(e) => handleKeyDown(idx, e, true)}
                    disabled={isLoading}
                    className="w-12 h-14 bg-dark-input text-center text-xl font-bold text-white rounded-xl border border-neutral-800 focus:border-dark-accent focus:outline-none transition-all shadow-inner"
                  />
                ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-xs leading-normal">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-slate-300 font-bold rounded-xl text-xs border border-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : mode === 'set' && !isConfirming ? (
                'Next'
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
