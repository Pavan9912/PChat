import React from 'react';
import { useSelector } from 'react-redux';
import { Phone, Video, Search, Info, Users } from 'lucide-react';
import { RootState } from '../../store';
import { useSocket } from '../../context/SocketContext';

interface ChatHeaderProps {
  onToggleRightSidebar: () => void;
  onSearchInChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleRightSidebar, onSearchInChat }) => {
  const { activeChat } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const { initiateCall } = useSocket();

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  if (!activeChat) return null;

  const getChatMetadata = () => {
    if (activeChat.isGroupChat) {
      return {
        name: activeChat.name || 'Group Chat',
        avatar: activeChat.avatar,
        status: `${activeChat.participants.length} members`,
      };
    }

    const partner = activeChat.participants.find((p) => p._id !== user?._id);
    return {
      name: partner?.name || 'Deleted Account',
      avatar: partner?.avatar || '',
      status: partner?.isOnline 
        ? 'online' 
        : partner?.lastSeen 
          ? `last seen ${new Date(partner.lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(partner.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'offline',
      isOnline: partner?.isOnline,
    };
  };

  const meta = getChatMetadata();

  const handleCall = (type: 'voice' | 'video') => {
    if (activeChat.isGroupChat) {
      alert('Group calling is not supported in this version. Direct calls only.');
      return;
    }
    const partner = activeChat.participants.find((p) => p._id !== user?._id);
    if (!partner) return;
    if (!partner.isOnline) {
      alert(`${partner.name} is offline. You can only call online users.`);
      return;
    }
    
    // Call user!
    initiateCall(partner._id, user!.name, user!.avatar, activeChat._id, type);
  };

  return (
    <div className="h-16 border-b border-neutral-900/60 px-4 flex items-center justify-between bg-[#202c33] shrink-0 select-none">
      
      {/* Participant info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0 cursor-pointer" onClick={onToggleRightSidebar}>
          {meta.avatar ? (
            <img
              src={meta.avatar.startsWith('/') ? `${apiHost}${meta.avatar}` : meta.avatar}
              alt={meta.name}
              className="w-10 h-10 rounded-xl object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-sm">
              {meta.name.charAt(0)}
            </div>
          )}
          {!activeChat.isGroupChat && meta.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
          )}
        </div>

        <div className="min-w-0 cursor-pointer" onClick={onToggleRightSidebar}>
          <div className="font-semibold text-sm text-white truncate">{meta.name}</div>
          <div className="text-[10px] text-dark-secondary truncate mt-0.5">{meta.status}</div>
        </div>
      </div>

      {/* Call controls & utility */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleCall('voice')}
          title="Voice Call"
          className="p-2 text-dark-secondary hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
        >
          <Phone className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={() => handleCall('video')}
          title="Video Call"
          className="p-2 text-dark-secondary hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
        >
          <Video className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={onSearchInChat}
          title="Search in Chat"
          className="p-2 text-dark-secondary hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
        >
          <Search className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={onToggleRightSidebar}
          title="Chat Information"
          className="p-2 text-dark-secondary hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
        >
          <Info className="w-4.5 h-4.5" />
        </button>
      </div>

    </div>
  );
};
export default ChatHeader;
