import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { RootState } from '../store';
import { addMessage, updateMessage, setTyping, stopTyping, setUserOnlineStatus, setChatBlockStatus, handleUserBlocked, handleUserUnblocked } from '../store/slices/chatSlice';
import { updateUserSuccess } from '../store/slices/authSlice';
import { setFriendOnlineStatus, addFriendRequest, IFriendRequest } from '../store/slices/friendSlice';
import { addNotification, INotification } from '../store/slices/notificationSlice';

export interface CallInfo {
  status: 'idle' | 'ringing_out' | 'ringing_in' | 'connected';
  callerName?: string;
  callerAvatar?: string;
  targetUserId?: string;
  chatId?: string;
  callType?: 'voice' | 'video';
  isIncoming: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  callInfo: CallInfo;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  facingMode: 'user' | 'environment';
  initiateCall: (targetUserId: string, callerName: string, callerAvatar: string, chatId: string, type: 'voice' | 'video') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Web Audio API Synthesizer helper for premium notification sound without file assets dependencies
const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Modern WhatsApp-like double chime bleep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.start();
    
    // Stop note 1
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    // Play second note
    setTimeout(() => {
      try {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 note
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        setTimeout(() => osc2.stop(), 200);
      } catch {}
    }, 120);

    setTimeout(() => osc.stop(), 200);
  } catch (err) {
    console.error('AudioContext sound synthesize error:', err);
  }
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const { activeChat } = useSelector((state: RootState) => state.chat);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const [callInfo, setCallInfo] = useState<CallInfo>({ status: 'idle', isIncoming: false });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const offerDataRef = useRef<any>(null);
  const queuedCandidatesRef = useRef<any[]>([]);

  const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io(socketUrl, {
      auth: { token },
      query: { token },
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('Socket Context: Connected to Server');
    });

    // Real-time chat events
    socketInstance.on('messageReceived', (message) => {
      dispatch(addMessage(message));

      // Play alert chime if sender is not active logged in user
      if (userRef.current && message.sender._id !== userRef.current._id) {
        playNotificationSound();
      }
    });

    socketInstance.on('messageUpdated', (message) => {
      dispatch(updateMessage(message));
    });

    socketInstance.on('typing', ({ chatId, userId, username }) => {
      dispatch(setTyping({ chatId, userId, username }));
    });

    socketInstance.on('stopTyping', ({ chatId, userId }) => {
      dispatch(stopTyping({ chatId, userId }));
    });

    // User online indicators
    socketInstance.on('userStatus', ({ userId, isOnline, lastSeen, user: statusUser }) => {
      const payload = { userId, isOnline, lastSeen: lastSeen ? new Date(lastSeen).toISOString() : undefined, user: statusUser };
      dispatch(setUserOnlineStatus(payload));
      dispatch(setFriendOnlineStatus(payload));

      if (userRef.current && userId === userRef.current._id) {
        dispatch(updateUserSuccess({ ...userRef.current, isOnline }));
      }
    });

    // Friendship request socket notifications
    socketInstance.on('friendRequestReceived', (request: IFriendRequest) => {
      dispatch(addFriendRequest(request));
      playNotificationSound();
    });

    // General app alerts notifications
    socketInstance.on('notificationReceived', (notification: INotification) => {
      dispatch(addNotification(notification));
    });

    // Real-time user block/unblock notifications
    socketInstance.on('userBlocked', ({ blockerId, blockedId }) => {
      const currentUser = userRef.current;
      if (currentUser) {
        dispatch(handleUserBlocked({ blockerId, blockedId, currentUserId: currentUser._id }));
        if (blockerId === currentUser._id) {
          const currentBlocked = currentUser.blockedUsers || [];
          if (!currentBlocked.includes(blockedId)) {
            dispatch(updateUserSuccess({
              ...currentUser,
              blockedUsers: [...currentBlocked, blockedId]
            }));
          }
        }
      }
    });

    socketInstance.on('userUnblocked', ({ blockerId, unblockedId }) => {
      const currentUser = userRef.current;
      if (currentUser) {
        dispatch(handleUserUnblocked({ blockerId, unblockedId, currentUserId: currentUser._id }));
        if (blockerId === currentUser._id) {
          const currentBlocked = currentUser.blockedUsers || [];
          dispatch(updateUserSuccess({
            ...currentUser,
            blockedUsers: currentBlocked.filter(id => id !== unblockedId)
          }));
        }
      }
    });

    // ----------------------------------------------------
    // WEBRTC CALLING RECEIVING SIGNAL LISTENER
    // ----------------------------------------------------

    // Incoming Call trigger
    socketInstance.on('incomingCall', ({ fromUserId, callerName, callerAvatar, offer, chatId, callType }) => {
      console.log(`Socket incomingCall event from ${fromUserId}, type ${callType}`);
      offerDataRef.current = offer;
      setCallInfo({
        status: 'ringing_in',
        callerName,
        callerAvatar,
        targetUserId: fromUserId,
        chatId,
        callType,
        isIncoming: true,
      });
    });

    // Call Accepted trigger
    socketInstance.on('callAccepted', async ({ answer }) => {
      console.log('Call accepted signaling received.');
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallInfo((prev) => ({ ...prev, status: 'connected' }));
          await processQueuedCandidates();
        } catch (error) {
          console.error('Error setting remote description on acceptCall:', error);
        }
      }
    });

    // Call Rejected trigger
    socketInstance.on('callRejected', () => {
      console.log('Call rejected by receiver.');
      cleanupCall();
    });

    // ICE Candidate relay
    socketInstance.on('iceCandidate', async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      } else {
        console.log('Socket Context: Queuing ICE candidate (remoteDescription not set yet)');
        queuedCandidatesRef.current.push(candidate);
      }
    });

    // Call Ended trigger
    socketInstance.on('callEnded', () => {
      console.log('Call ended by remote client.');
      cleanupCall();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      cleanupCall();
    };
  }, [token]);

  // Handle room joining/leaving when activeChat changes
  useEffect(() => {
    if (!socket || !activeChat) return;

    socket.emit('joinChat', activeChat._id);

    return () => {
      socket.emit('leaveChat', activeChat._id);
    };
  }, [socket, activeChat]);

  // ----------------------------------------------------
  // CALL CONTROL ACTIONS (WebRTC logic)
  // ----------------------------------------------------

  const cleanupCall = () => {
    setCallInfo({ status: 'idle', isIncoming: false });
    queuedCandidatesRef.current = [];
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setFacingMode('user');
  };

  const processQueuedCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription && queuedCandidatesRef.current.length > 0) {
      console.log(`Socket Context: Processing ${queuedCandidatesRef.current.length} queued ICE candidates`);
      const candidates = [...queuedCandidatesRef.current];
      queuedCandidatesRef.current = [];
      for (const cand of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (error) {
          console.error('Error adding queued ICE candidate:', error);
        }
      }
    }
  };

  const getMediaStream = async (type: 'voice' | 'video', customFacingMode?: 'user' | 'environment'): Promise<MediaStream | null> => {
    try {
      const activeFacingMode = customFacingMode || facingMode;
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: activeFacingMode, width: 640, height: 480 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('GetUserMedia hardware access error:', error);
      // Fallback: create mock stream (silent audio canvas) to keep app running without permissions error in dev
      return null;
    }
  };

  const createPeerConnection = (targetUserId: string, stream: MediaStream | null) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // For production, configure custom TURN servers here to relay media behind symmetric firewalls:
        // {
        //   urls: 'turn:YOUR_TURN_SERVER_DOMAIN_OR_IP:3478',
        //   username: 'YOUR_TURN_USERNAME',
        //   credential: 'YOUR_TURN_PASSWORD'
        // }
      ],
    });

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.ontrack = (event) => {
      console.log('WebRTC ontrack event triggered.');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('iceCandidate', {
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // 1. Initiate Call (Outgoing call)
  const initiateCall = async (
    targetUserId: string,
    callerName: string,
    callerAvatar: string,
    chatId: string,
    type: 'voice' | 'video'
  ) => {
    if (!socket) return;
    cleanupCall();

    const stream = await getMediaStream(type);
    if (!stream) {
      alert(`Could not access your ${type === 'video' ? 'camera/microphone' : 'microphone'}. Please check device permissions.`);
      return;
    }

    setCallInfo({
      status: 'ringing_out',
      callerName: callerName,
      callerAvatar: callerAvatar,
      targetUserId,
      chatId,
      callType: type,
      isIncoming: false,
    });

    const pc = createPeerConnection(targetUserId, stream);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', {
        targetUserId,
        offer,
        chatId,
        callType: type,
        callerName,
        callerAvatar,
      });
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
      cleanupCall();
    }
  };

  // 2. Accept Call (Incoming call)
  const acceptCall = async () => {
    if (!socket || !callInfo.targetUserId || !offerDataRef.current) return;

    const type = callInfo.callType || 'voice';
    const stream = await getMediaStream(type);
    if (!stream) {
      alert(`Could not access your ${type === 'video' ? 'camera/microphone' : 'microphone'}. Please check device permissions.`);
      rejectCall();
      return;
    }

    const pc = createPeerConnection(callInfo.targetUserId, stream);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerDataRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('acceptCall', {
        targetUserId: callInfo.targetUserId,
        answer,
      });

      setCallInfo((prev) => ({ ...prev, status: 'connected' }));
      await processQueuedCandidates();
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupCall();
    }
  };

  // 3. Reject Call
  const rejectCall = () => {
    if (socket && callInfo.targetUserId) {
      socket.emit('rejectCall', { targetUserId: callInfo.targetUserId });
    }
    cleanupCall();
  };

  // 4. End Call
  const endCall = () => {
    if (socket && callInfo.targetUserId) {
      socket.emit('endCall', { targetUserId: callInfo.targetUserId });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callInfo.callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    if (callInfo.callType !== 'video') return;
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();

        try {
          const constraints = {
            audio: false,
            video: { facingMode: newFacingMode, width: 640, height: 480 },
          };
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          const newVideoTrack = newStream.getVideoTracks()[0];

          if (newVideoTrack) {
            localStreamRef.current.removeTrack(videoTrack);
            localStreamRef.current.addTrack(newVideoTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

            if (peerConnectionRef.current) {
              const senders = peerConnectionRef.current.getSenders();
              const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
              if (videoSender) {
                await videoSender.replaceTrack(newVideoTrack);
              }
            }
          }
        } catch (err) {
          console.error('Failed to switch camera:', err);
          alert('Could not switch camera. Check if device has multiple cameras.');
        }
      }
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        callInfo,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        facingMode,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
