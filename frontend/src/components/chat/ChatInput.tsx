import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Send, Smile, Paperclip, Mic, Square, X, Image, FileText, Film, Volume2, CornerDownLeft } from 'lucide-react';
import { RootState } from '../../store';
import { useSocket } from '../../context/SocketContext';
import { IMessage } from '../../store/slices/chatSlice';

interface ChatInputProps {
  onSendMessage: (formData: FormData) => void;
  replyingTo: IMessage | null;
  onClearReply: () => void;
  editingMessage: IMessage | null;
  onClearEdit: () => void;
  onSendEditedText: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  replyingTo,
  onClearReply,
  editingMessage,
  onClearEdit,
  onSendEditedText,
}) => {
  const { activeChat } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocket();

  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  // Voice recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileTypeAccept, setFileTypeAccept] = useState('*');

  // Trigger stop typing on blur or unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Update record duration counter
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setRecordDuration(0);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  // If editingMessage changes, preload text
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
    } else {
      setText('');
    }
  }, [editingMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    emitTyping();
  };

  // Socket typing signaling throttle
  const emitTyping = () => {
    if (!socket || !activeChat) return;

    socket.emit('typing', {
      chatId: activeChat._id,
      recipientIds: activeChat.participants.map((p) => p._id).filter((id) => id !== user?._id),
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    typingTimerRef.current = setTimeout(() => {
      socket.emit('stopTyping', {
        chatId: activeChat._id,
        recipientIds: activeChat.participants.map((p) => p._id).filter((id) => id !== user?._id),
      });
    }, 2000);
  };

  const handleSend = () => {
    if (!text.trim() && !editingMessage) return;

    if (editingMessage) {
      onSendEditedText(text.trim());
      setText('');
      return;
    }

    const formData = new FormData();
    formData.append('chatId', activeChat!._id);
    formData.append('content', text.trim());
    if (replyingTo) {
      formData.append('repliedToId', replyingTo._id);
    }

    onSendMessage(formData);
    setText('');
    onClearReply();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Trigger file choosing attachment clicks
  const triggerAttachment = (acceptType: string) => {
    setFileTypeAccept(acceptType);
    setShowAttachMenu(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('chatId', activeChat!._id);
    formData.append('file', file);
    if (replyingTo) {
      formData.append('repliedToId', replyingTo._id);
    }

    onSendMessage(formData);
    onClearReply();
    // Reset file input value so same file can be chosen twice
    e.target.value = '';
  };

  // ----------------------------------------------------
  // VOICE NOTE RECORDER OPERATIONS (MediaRecorder)
  // ----------------------------------------------------

  const handleStartRecord = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('chatId', activeChat!._id);
        formData.append('file', voiceFile);
        formData.append('isVoice', 'true');
        if (replyingTo) {
          formData.append('repliedToId', replyingTo._id);
        }

        onSendMessage(formData);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Audio recorder microphone permission error:', err);
      alert('Microphone access denied or not available.');
    }
  };

  const handleStopRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Quick Emoji selections
  const quickEmojis = ['😀', '😂', '👍', '❤️', '🔥', '🎉', '💡', '🚀'];
  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiMenu(false);
    emitTyping();
  };

  return (
    <div className="border-t border-neutral-900 bg-dark-panel p-3 flex flex-col gap-2 shrink-0 select-none relative">
      
      {/* Hidden File Input handler */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={fileTypeAccept}
        className="hidden"
      />

      {/* Reply header wrapper */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 rounded-xl text-xs text-dark-secondary mb-1 border border-neutral-800">
          <div className="min-w-0">
            <span className="font-semibold text-dark-accent mr-1">Replying to:</span>
            <span className="truncate">{replyingTo.content}</span>
          </div>
          <button onClick={onClearReply} className="text-dark-secondary hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit header wrapper */}
      {editingMessage && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 rounded-xl text-xs text-dark-secondary mb-1 border border-neutral-800">
          <div className="min-w-0">
            <span className="font-semibold text-indigo-400 mr-1">Editing message:</span>
            <span className="truncate">{editingMessage.content}</span>
          </div>
          <button onClick={onClearEdit} className="text-dark-secondary hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="flex items-center gap-2">
        {/* Attachment Pin toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiMenu(false);
            }}
            className={`p-2 hover:bg-neutral-800 hover:text-white rounded-xl transition-all ${
              showAttachMenu ? 'text-white bg-neutral-800' : 'text-dark-secondary'
            }`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-950 border border-neutral-900 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 min-w-44">
              <button
                type="button"
                onClick={() => triggerAttachment('image/*')}
                className="flex items-center gap-2.5 p-2.5 hover:bg-neutral-900 rounded-xl text-xs font-semibold text-slate-300 text-left transition-colors"
              >
                <Image className="w-4.5 h-4.5 text-emerald-400" />
                Image Attachment
              </button>
              <button
                type="button"
                onClick={() => triggerAttachment('video/*')}
                className="flex items-center gap-2.5 p-2.5 hover:bg-neutral-900 rounded-xl text-xs font-semibold text-slate-300 text-left transition-colors"
              >
                <Film className="w-4.5 h-4.5 text-blue-400" />
                Video Media
              </button>
              <button
                type="button"
                onClick={() => triggerAttachment('audio/*')}
                className="flex items-center gap-2.5 p-2.5 hover:bg-neutral-900 rounded-xl text-xs font-semibold text-slate-300 text-left transition-colors"
              >
                <Volume2 className="w-4.5 h-4.5 text-indigo-400" />
                Audio File
              </button>
              <button
                type="button"
                onClick={() => triggerAttachment('*')}
                className="flex items-center gap-2.5 p-2.5 hover:bg-neutral-900 rounded-xl text-xs font-semibold text-slate-300 text-left transition-colors"
              >
                <FileText className="w-4.5 h-4.5 text-amber-400" />
                Document File
              </button>
            </div>
          )}
        </div>

        {/* Emoji smile drawer toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowEmojiMenu(!showEmojiMenu);
              setShowAttachMenu(false);
            }}
            className={`p-2 hover:bg-neutral-800 hover:text-white rounded-xl transition-all ${
              showEmojiMenu ? 'text-white bg-neutral-800' : 'text-dark-secondary'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

          {showEmojiMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-950 border border-neutral-900 rounded-2xl shadow-2xl p-2.5 grid grid-cols-4 gap-1.5 z-50 w-48">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="w-9 h-9 rounded-xl hover:bg-neutral-900 text-lg flex items-center justify-center transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Area Input / Recording status panel */}
        {!isRecording ? (
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={editingMessage ? 'Edit your message...' : 'Write a message...'}
            className="flex-1 px-4 py-2.5 bg-dark-input text-sm text-white rounded-xl focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
          />
        ) : (
          <div className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-bold animate-pulse">
            <div className="flex items-center gap-2">
              <Square className="w-3.5 h-3.5 fill-red-500 text-red-500 animate-pulse" />
              <span>Recording voice note...</span>
            </div>
            <span>{formatRecordTime(recordDuration)}</span>
          </div>
        )}

        {/* Voice Note Mic Trigger / Send Button */}
        {text.trim() || editingMessage ? (
          <button
            onClick={handleSend}
            className="p-3 bg-dark-accent hover:opacity-90 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        ) : !isRecording ? (
          <button
            onClick={handleStartRecord}
            title="Record Voice Note"
            className="p-3 bg-neutral-900 hover:bg-neutral-800 text-dark-secondary hover:text-white rounded-xl transition-all"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>
        ) : (
          <button
            onClick={handleStopRecord}
            title="Stop & Send Voice Note"
            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-md shadow-red-500/10"
          >
            <Square className="w-4.5 h-4.5 fill-white" />
          </button>
        )}
      </div>
    </div>
  );
};
export default ChatInput;
