import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MoreVertical, Star, Pin, CornerUpLeft, Edit3, Trash2, Download, Play, Pause, AlertTriangle } from 'lucide-react';
import { RootState } from '../../store';
import { IMessage } from '../../store/slices/chatSlice';

interface MessageBubbleProps {
  msg: IMessage;
  onReact: (msgId: string, emoji: string) => void;
  onStar: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onDelete: (msgId: string, type: 'me' | 'everyone') => void;
  onEdit: (msg: IMessage) => void;
  onReply: (msg: IMessage) => void;
  onReport: (msgId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  onReact,
  onStar,
  onPin,
  onDelete,
  onEdit,
  onReply,
  onReport,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isSelf = msg.sender._id === user?._id;

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  const emojiReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const isStarred = msg.starredBy.includes(user?._id || '');

  // Custom audio/voice note player logic
  const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      const audio = new Audio(url.startsWith('/') ? `${apiHost}${url}` : url);
      audioRef.current = audio;

      const setAudioData = () => {
        setDuration(audio.duration || 0);
      };

      const setAudioTime = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.pause();
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', handleEnded);
      };
    }, [url]);

    const handlePlayPause = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    const formatTime = (secs: number) => {
      if (isNaN(secs)) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
      <div className="flex items-center gap-2.5 py-1.5 px-1 bg-neutral-900/40 rounded-xl max-w-xs border border-neutral-900">
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 rounded-full bg-dark-accent text-slate-950 flex items-center justify-center hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause className="w-4.5 h-4.5 fill-slate-950" /> : <Play className="w-4.5 h-4.5 fill-slate-950 ml-0.5" />}
        </button>
        <div className="flex flex-col flex-1 gap-1">
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden relative w-36">
            <div
              className="h-full bg-dark-accent rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-dark-secondary">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    );
  };

  const getMediaUrl = (url: string) => {
    return url.startsWith('/') ? `${apiHost}${url}` : url;
  };

  return (
    <div
      className={`flex flex-col max-w-[85%] sm:max-w-[70%] group relative pb-3 select-text ${
        isSelf ? 'self-end items-end message-self' : 'self-start items-start message-other'
      }`}
    >
      {/* Sender profile name (only for other's messages in groups) */}
      {!isSelf && (
        <span className="text-[10px] text-dark-secondary mb-1 font-bold pl-1.5">
          {msg.sender.name}
        </span>
      )}

      {/* Reply source preview */}
      {msg.repliedTo && (
        <div className="bg-neutral-900/60 p-2.5 rounded-t-xl border border-neutral-800 border-b-transparent text-[11px] text-slate-300 w-full flex flex-col gap-0.5 pointer-events-none">
          <span className="font-bold text-dark-accent">
            Replying to {msg.repliedTo.sender._id === user?._id ? 'yourself' : msg.repliedTo.sender.name}
          </span>
          <span className="truncate max-w-xs">{msg.repliedTo.content}</span>
        </div>
      )}

      {/* Message Box */}
      <div
        className={`p-3 rounded-2xl shadow-md relative ${
          isSelf
            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
        } ${msg.repliedTo ? 'rounded-t-none' : ''}`}
      >
        {/* Rich media renderers */}
        {msg.messageType === 'image' && msg.mediaUrl && (
          <img
            src={getMediaUrl(msg.mediaUrl)}
            alt="Uploaded media"
            className="rounded-lg max-h-60 max-w-full object-cover mb-2 border border-neutral-800 cursor-zoom-in hover:opacity-95 transition-opacity"
            onClick={() => window.open(getMediaUrl(msg.mediaUrl!), '_blank')}
          />
        )}

        {msg.messageType === 'video' && msg.mediaUrl && (
          <video
            src={getMediaUrl(msg.mediaUrl)}
            controls
            className="rounded-lg max-h-60 max-w-full mb-2 border border-neutral-800"
          />
        )}

        {msg.messageType === 'gif' && msg.mediaUrl && (
          <img
            src={getMediaUrl(msg.mediaUrl)}
            alt="GIF"
            className="rounded-lg max-h-60 max-w-full object-cover mb-2"
          />
        )}

        {msg.messageType === 'document' && msg.mediaUrl && (
          <div className="flex items-center gap-3 p-2 bg-neutral-900/40 rounded-xl mb-2 border border-neutral-900 text-sm">
            <div className="w-10 h-10 rounded-lg bg-dark-accent/10 text-dark-accent flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-semibold truncate text-xs">{msg.fileName || 'document.pdf'}</div>
              <div className="text-[10px] text-dark-secondary mt-0.5">
                {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : 'PDF'}
              </div>
            </div>
            <a
              href={getMediaUrl(msg.mediaUrl)}
              download
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-dark-secondary hover:text-white transition-colors"
            >
              <Download className="w-4.5 h-4.5" />
            </a>
          </div>
        )}

        {(msg.messageType === 'audio' || msg.messageType === 'voice') && msg.mediaUrl && (
          <div className="mb-2">
            <AudioPlayer url={msg.mediaUrl} />
          </div>
        )}

        {/* Text Content */}
        {!msg.deletedEveryone ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap word-break">{msg.content}</p>
        ) : (
          <p className="text-sm italic text-dark-secondary">{msg.content}</p>
        )}

        {/* Pin, Star & Time indicators */}
        <div className="flex items-center justify-end gap-1.5 mt-2.5 select-none">
          {msg.isPinned && <Pin className={`w-3 h-3 rotate-45 ${isSelf ? 'text-white/70' : 'text-dark-accent'}`} />}
          {isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
          {msg.isEdited && <span className={`text-[9px] font-medium ${isSelf ? 'text-white/60' : 'text-dark-secondary'}`}>edited</span>}
          <span className={`text-[9px] ${isSelf ? 'text-white/65' : 'text-dark-secondary'}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Reactions listing badge */}
        {msg.reactions.length > 0 && (
          <div className="absolute -bottom-2.5 right-2 px-1.5 py-0.5 rounded-full bg-dark-panel border border-neutral-800 text-[10px] shadow-lg flex items-center gap-0.5 select-none hover:scale-105 transition-transform z-10">
            {msg.reactions.map((r, idx) => (
              <span key={idx} title={`Reacted by user`}>
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Hover menu trigger */}
      {!msg.deletedEveryone && (
        <div
          ref={dropdownRef}
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1 bg-slate-950 border border-neutral-900 p-1.5 rounded-xl shadow-2xl ${
            isSelf ? 'right-full mr-2' : 'left-full ml-2'
          }`}
        >
          {/* Quick Reactions toolbar */}
          <div className="hidden group-hover:flex items-center border-r border-neutral-900 pr-1.5 mr-1.5 gap-0.5">
            {emojiReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(msg._id, emoji)}
                className="hover:scale-125 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            onClick={() => onReply(msg)}
            title="Reply"
            className="p-1 text-dark-secondary hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => onStar(msg._id)}
            title={isStarred ? 'Unstar Message' : 'Star Message'}
            className="p-1 text-dark-secondary hover:text-amber-400 hover:bg-neutral-900 rounded-md transition-colors"
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          {/* Trigger vertical dropdown menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 text-dark-secondary hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {showDropdown && (
              <div
                className={`absolute bottom-full mb-2 bg-slate-950 border border-neutral-900 rounded-xl shadow-2xl p-1.5 text-xs font-semibold text-dark-secondary flex flex-col min-w-36 z-50 ${
                  isSelf ? 'right-0' : 'left-0'
                }`}
              >
                <button
                  onClick={() => {
                    onPin(msg._id);
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-neutral-900 rounded-lg text-left text-white transition-colors"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {msg.isPinned ? 'Unpin message' : 'Pin message'}
                </button>
                {isSelf && msg.messageType === 'text' && (
                  <button
                    onClick={() => {
                      onEdit(msg);
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2 p-2 hover:bg-neutral-900 rounded-lg text-left text-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit message
                  </button>
                )}
                {isSelf && (
                  <button
                    onClick={() => {
                      onDelete(msg._id, 'everyone');
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2 p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-left transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete for everyone
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(msg._id, 'me');
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-left transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete for me
                </button>
                {!isSelf && (
                  <button
                    onClick={() => {
                      onReport(msg._id);
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2 p-2 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg text-left transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Report message
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default MessageBubble;
