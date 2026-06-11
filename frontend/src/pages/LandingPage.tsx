import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import { RootState } from '../store';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

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
            <a href="#" className="hover:text-slate-300">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
