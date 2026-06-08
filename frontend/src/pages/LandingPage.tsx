import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MessageSquare, Shield, Zap, Video, Users, Moon, ArrowRight } from 'lucide-react';
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
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            PChatNow
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

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in">
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            PChatNow
          </span>
        </h1>
        <p className="text-2xl md:text-3xl font-light tracking-wide text-emerald-400 mb-8 max-w-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

      {/* Feature Grid */}
      <section className="relative z-10 bg-slate-900/40 border-t border-slate-900 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Engaging Chat Experience</h2>
            <p className="text-slate-400 max-w-xl mx-auto">PChatNow comes pre-packed with state of the art tools to keep you in sync with colleagues, friends, and family.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Real-time messaging */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Messaging</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Bidirectional real-time Socket.IO streams deliver your messages instantly. Read receipts, typing states, and emoji reactions update live.
              </p>
            </div>

            {/* Calling */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Voice & Video Calls</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                WebRTC audio-video channels let you make high-fidelity calls. Integrated controls enable easy mic muting or camera toggles.
              </p>
            </div>

            {/* Groups */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Group Channels</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Create chat rooms, coordinate admin structures, add members, or send invite links to let anyone join in seconds.
              </p>
            </div>

            {/* Security */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Secure Operations</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Equipped with hashed passwords, JWT validation in secure cookies, CORS limits, request rate mitigations, and input sanitization filters.
              </p>
            </div>

            {/* Themes */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Moon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Dark & Light Themes</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Easily toggle between a sleek tech dark view or clean light themes, persisting the layout settings locally across sessions.
              </p>
            </div>

            {/* File Sharing */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Rich Attachments</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Upload images, videos, voice notes, PDFs, or slides. Cloudinary cloud caching and local server fallbacks ensure uploads always load.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-tr from-slate-900 via-slate-900 to-indigo-950/20 border border-slate-800 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">What our users say</h3>
              <p className="text-slate-400 italic mb-6">
                "PChatNow completely changed how our development team stays in touch. The voice notes and the instant group calling features feel extremely responsive and premium, and the dark mode is gorgeous."
              </p>
              <div>
                <span className="font-bold text-white block">Alex Mercer</span>
                <span className="text-xs text-slate-500">Lead Tech Architect, Vellum Dev</span>
              </div>
            </div>
            <div className="w-full md:w-1/3 flex justify-center">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 bg-emerald-400/20 rounded-2xl blur-xl" />
                <div className="relative w-full h-full rounded-2xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                  <div className="text-3xl font-black text-emerald-400">99.9%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase mt-2">Uptime verified</div>
                  <div className="text-xl font-bold text-white mt-4">PChatNow Live</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-10 mt-auto bg-slate-950/60">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-400 flex items-center justify-center text-slate-950 font-black text-[9px] tracking-tighter">PCN</div>
            <span>PChatNow &copy; {new Date().getFullYear()}</span>
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
