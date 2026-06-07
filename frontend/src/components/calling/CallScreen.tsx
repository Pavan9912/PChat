import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const CallScreen: React.FC = () => {
  const {
    callInfo,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useSocket();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callInfo.status]);

  // Attach remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callInfo.status]);

  if (callInfo.status === 'idle') return null;

  const isRingingIn = callInfo.status === 'ringing_in';
  const isRingingOut = callInfo.status === 'ringing_out';
  const isConnected = callInfo.status === 'connected';

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md select-none font-sans text-white p-6">
      
      {/* Visual background blurred glow */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Ringing/Calling Caller Info */}
      {!isConnected && (
        <div className="flex flex-col items-center text-center mt-10 animate-fade-in">
          <div className="relative mb-6">
            {callInfo.callerAvatar ? (
              <img
                src={callInfo.callerAvatar.startsWith('/') ? `${apiHost}${callInfo.callerAvatar}` : callInfo.callerAvatar}
                alt={callInfo.callerName}
                className="w-28 h-28 rounded-3xl object-cover border-4 border-emerald-500/20 shadow-2xl calling-pulse"
              />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-neutral-850 border-4 border-emerald-500/20 flex items-center justify-center font-bold text-white text-4xl shadow-2xl calling-pulse uppercase">
                {callInfo.callerName?.charAt(0) || 'C'}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 text-slate-950 rounded-full border-4 border-slate-950">
              <Phone className="w-4 h-4 fill-slate-950" />
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-1">{callInfo.callerName || 'PChat User'}</h2>
          <span className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">
            {isRingingIn ? 'Incoming call...' : 'Calling connection...'}
          </span>
        </div>
      )}

      {/* WebRTC Video Feeds */}
      {isConnected && (
        <div className="flex-1 w-full max-w-4xl relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl mb-8 mt-6">
          {callInfo.callType === 'video' ? (
            <>
              {/* Remote stream video feed */}
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-dark-secondary">
                  <Video className="w-12 h-12 text-neutral-800 animate-pulse" />
                  <p className="text-sm font-semibold">Waiting for camera feed...</p>
                </div>
              )}

              {/* Local stream video feed PIP */}
              {localStream && !isVideoOff && (
                <div className="absolute top-4 right-4 w-36 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-slate-950 bg-slate-950 shadow-2xl z-20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}
            </>
          ) : (
            /* Voice note only calling overlay styling */
            <div className="flex flex-col items-center justify-center text-center p-6 gap-6">
              <div className="w-32 h-32 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 calling-pulse">
                <Volume2 className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{callInfo.callerName || 'Audio Call'}</h3>
                <span className="text-xs text-dark-secondary block mt-1">Voice call connected</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calling Buttons Control panel bar */}
      <div className="flex items-center gap-6 mt-auto mb-10 z-20 select-none animate-fade-in" style={{ animationDelay: '0.2s' }}>
        
        {/* Mute Mic toggle */}
        {isConnected && (
          <button
            onClick={toggleMute}
            className={`p-4 rounded-2xl hover:scale-105 border transition-all ${
              isMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-neutral-900 border-neutral-800 text-dark-secondary hover:text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        )}

        {/* Decline/Reject button */}
        {(isRingingOut || isConnected) ? (
          <button
            onClick={endCall}
            className="p-5 rounded-3xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 hover:scale-105 transition-transform"
          >
            <PhoneOff className="w-7 h-7 fill-white" />
          </button>
        ) : null}

        {/* Incoming call actions */}
        {isRingingIn && (
          <div className="flex items-center gap-6">
            <button
              onClick={rejectCall}
              className="p-5 rounded-3xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 hover:scale-105 transition-transform"
            >
              <PhoneOff className="w-7 h-7 fill-white" />
            </button>
            <button
              onClick={acceptCall}
              className="p-5 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
            >
              <Phone className="w-7 h-7 fill-slate-950" />
            </button>
          </div>
        )}

        {/* Toggle Camera off */}
        {isConnected && callInfo.callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-2xl hover:scale-105 border transition-all ${
              isVideoOff
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-neutral-900 border-neutral-800 text-dark-secondary hover:text-white'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

      </div>

    </div>
  );
};
export default CallScreen;
