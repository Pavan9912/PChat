import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, Mail, X } from 'lucide-react';
import { RootState } from '../store';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleCTA = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-emerald-500 selection:text-slate-900">
      
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-black text-slate-950 text-base tracking-tighter shadow-lg shadow-emerald-500/20">
            PCN
          </div>
          <span className="text-xl tracking-tight">
            <span className="font-extrabold text-white">PChat</span>
            <span className="font-medium text-slate-400">Now</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all border border-slate-700"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Production-Ready Chat App
        </div>

        <h1 className="text-5xl md:text-7xl tracking-tight mb-6 animate-fade-in">
          <span className="font-black text-white">PChat</span>
          <span className="font-medium text-slate-400">Now</span>
        </h1>
        <p className="text-2xl md:text-3xl font-semibold tracking-wide text-[#00a884] mb-8 max-w-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Connect. Chat. Instantly.
        </p>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          A secure, high-performance messaging interface equipped with real-time conversations, typing alerts, voice and video call streams, multimedia uploads, and moderate admin tools.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleCTA}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 group hover:scale-[1.02]"
          >
            {user ? 'Enter Dashboard' : 'Start Chatting Now'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          {!user && (
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all border border-slate-800 hover:border-slate-700"
            >
              Create Account
            </button>
          )}
        </div>
      </section>



      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-10 mt-auto bg-slate-950/60">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-400 flex items-center justify-center text-slate-950 font-black text-[9px] tracking-tighter">PCN</div>
            <span className="text-xs tracking-tight">
              <span className="font-bold text-white">PChat</span>
              <span className="font-medium text-slate-400">Now</span>
              <span className="text-slate-500 ml-1.5">&copy; {new Date().getFullYear()}</span>
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <button
              onClick={() => setShowSupportModal(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </footer>

      {/* Contact Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative select-none">
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-neutral-850 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-2">Contact Support</h3>
            <p className="text-xs text-slate-400 mb-6">
              Our support team is here to help you. Reach out to us via Email or WhatsApp.
            </p>

            <div className="space-y-4">
              {/* Email support option */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-950/20 border border-neutral-800/60 hover:border-neutral-800 rounded-xl transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Email Us</span>
                    <span className="text-xs text-slate-300 font-semibold truncate block">pavanbyagari9912@gmail.com</span>
                  </div>
                </div>
                <a
                  href="mailto:pavanbyagari9912@gmail.com"
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[10px] font-bold transition-colors shrink-0"
                >
                  Mail
                </a>
              </div>

              {/* WhatsApp support option */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-950/20 border border-neutral-800/60 hover:border-neutral-800 rounded-xl transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 2c-5.514 0-9.99 4.476-9.99 9.99 0 1.764.459 3.48 1.332 4.992L2 22l5.184-1.359c1.467.801 3.12 1.224 4.815 1.224 5.513 0 9.99-4.476 9.99-9.99v-.006C22.01 6.48 17.534 2 12.031 2zm0 1.62c4.614 0 8.367 3.753 8.367 8.37 0 4.617-3.753 8.37-8.367 8.37-1.464 0-2.895-.384-4.155-1.116l-.297-.174-3.084.81.825-3.003-.192-.306c-.792-1.266-1.212-2.73-1.212-4.233-.003-4.614 3.75-8.367 8.364-8.367h.009zm-3.327 3.39c-.18 0-.387.045-.558.234-.171.189-.657.639-.657 1.557 0 .918.666 1.809.756 1.935.09.126 1.284 2.085 3.165 2.829.447.177.795.285 1.071.372.45.141.858.12 1.182.072.36-.054 1.107-.45 1.263-.888.156-.438.156-.816.108-.888-.048-.072-.18-.126-.378-.216-.198-.09-1.167-.576-1.347-.639-.18-.063-.312-.09-.444.09-.132.18-.51.639-.624.765-.114.126-.228.144-.426.054a5.352 5.352 0 0 1-1.569-1.026c-.49-.477-.822-1.053-.918-1.233-.096-.18-.009-.279.081-.369.081-.081.18-.216.27-.324.09-.108.12-.18.18-.306.06-.126.03-.234-.015-.324-.045-.09-.444-1.071-.606-1.476-.159-.387-.324-.333-.444-.339-.114-.006-.246-.006-.378-.006z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">WhatsApp</span>
                    <span className="text-xs text-slate-300 font-semibold truncate block">+91 9912634731</span>
                  </div>
                </div>
                <a
                  href="https://wa.me/919912634731"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[10px] font-bold transition-colors shrink-0"
                >
                  Chat
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LandingPage;
