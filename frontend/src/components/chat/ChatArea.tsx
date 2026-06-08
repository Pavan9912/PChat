import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MessageSquare, ArrowDown, Search, X } from 'lucide-react';
import { RootState } from '../../store';
import { fetchMessagesStart, fetchMessagesSuccess, fetchMessagesFailure, addMessage, updateMessage } from '../../store/slices/chatSlice';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { IMessage } from '../../store/slices/chatSlice';

interface ChatAreaProps {
  onToggleRightSidebar: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onToggleRightSidebar }) => {
  const dispatch = useDispatch();
  const { activeChat, messages, currentPage, totalPages, typingUsers } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);

  const [replyingTo, setReplyingTo] = useState<IMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);

  // Search inside chat states
  const [showLocalSearch, setShowLocalSearch] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Spam / Advertising');
  const [reportCustomReason, setReportCustomReason] = useState('');

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Load message logs of active chat
  const loadMessages = async (pageNumber: number = 1) => {
    if (!activeChat) return;
    if (pageNumber === 1) {
      dispatch(fetchMessagesStart());
    }

    try {
      const res = await fetch(`${apiHost}/api/messages/${activeChat._id}?page=${pageNumber}&limit=40`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      dispatch(
        fetchMessagesSuccess({
          messages: data.messages,
          currentPage: data.currentPage,
          totalPages: data.totalPages,
        })
      );

      // Auto scroll to bottom on page 1 load
      if (pageNumber === 1) {
        setTimeout(() => scrollToBottom(), 80);
      }
    } catch (err: any) {
      dispatch(fetchMessagesFailure(err.message || 'Failed to load conversation logs'));
    }
  };

  useEffect(() => {
    loadMessages(1);
    setReplyingTo(null);
    setEditingMessage(null);
    setShowLocalSearch(false);
    setLocalSearchQuery('');
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Infinite Scroll event handler
  const handleScroll = () => {
    if (!feedContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;

    // Show "Scroll to bottom" button if scrolled up
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);

    // If scroll reaches top, fetch older messages
    if (scrollTop === 0 && currentPage < totalPages) {
      const currentScrollHeight = scrollHeight;
      loadMessages(currentPage + 1).then(() => {
        // Adjust scroll position after prepending items to avoid scroll jumps
        setTimeout(() => {
          if (feedContainerRef.current) {
            feedContainerRef.current.scrollTop =
              feedContainerRef.current.scrollHeight - currentScrollHeight;
          }
        }, 30);
      });
    }
  };

  const handleSendMessage = async (formData: FormData) => {
    try {
      const res = await fetch(`${apiHost}/api/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(addMessage(data));
        setTimeout(() => scrollToBottom(), 50);
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const handleSendEditedText = async (content: string) => {
    if (!editingMessage) return;
    try {
      const res = await fetch(`${apiHost}/api/messages/${editingMessage._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(updateMessage(data));
      }
    } catch (err) {
      console.error('Edit message API error:', err);
    } finally {
      setEditingMessage(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`${apiHost}/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(updateMessage(data));
      }
    } catch (err) {
      console.error('Emoji reaction failed:', err);
    }
  };

  const handleStar = async (messageId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/messages/${messageId}/star`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Toggle starred state on the specific message
        const updatedMsg = messages.find((m) => m._id === messageId);
        if (updatedMsg) {
          const isStarred = updatedMsg.starredBy.includes(user?._id || '');
          const newStarredBy = isStarred
            ? updatedMsg.starredBy.filter((id) => id !== user?._id)
            : [...updatedMsg.starredBy, user?._id || ''];
          dispatch(updateMessage({ ...updatedMsg, starredBy: newStarredBy }));
        }
      }
    } catch (err) {
      console.error('Star toggle failed:', err);
    }
  };

  const handlePin = async (messageId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) {
        const updatedMsg = messages.find((m) => m._id === messageId);
        if (updatedMsg) {
          dispatch(updateMessage({ ...updatedMsg, isPinned: data.isPinned }));
        }
      }
    } catch (err) {
      console.error('Pin toggle failed:', err);
    }
  };

  const handleDelete = async (messageId: string, type: 'me' | 'everyone') => {
    try {
      const res = await fetch(`${apiHost}/api/messages/${messageId}?type=${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'everyone') {
          dispatch(updateMessage(data.message));
        } else {
          // Delete from local messages list
          // wait, since the backend handles deletedFor, a simple refresh or local filter is perfect
          loadMessages(1);
        }
      }
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  const handleInitiateReport = (msgId: string) => {
    setReportingMessageId(msgId);
    setReportReason('Spam / Advertising');
    setReportCustomReason('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportingMessageId) return;
    const finalReason = reportReason === 'Other' ? reportCustomReason : reportReason;
    if (reportReason === 'Other' && !reportCustomReason.trim()) {
      alert('Please enter a reason for reporting.');
      return;
    }

    try {
      const res = await fetch(`${apiHost}/api/admin/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: 'message',
          reportedMessageId: reportingMessageId,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Thank you! The message has been reported to the administrators.');
      } else {
        throw new Error(data.message || 'Failed to submit report');
      }
    } catch (err: any) {
      console.error('Report submission failed:', err);
      alert(err.message || 'Failed to submit report');
    } finally {
      setShowReportModal(false);
      setReportingMessageId(null);
    }
  };

  // Get typing users lists strings
  const getTypingText = () => {
    if (!activeChat) return '';
    const typers = typingUsers[activeChat._id];
    if (!typers) return '';

    const list = Object.values(typers).filter((n) => n !== user?.username);
    if (list.length === 0) return '';
    if (list.length === 1) return `${list[0]} is typing...`;
    return `${list.join(', ')} are typing...`;
  };

  const typingString = getTypingText();

  // Local client-side message search filter
  const filteredMessages = messages.filter((m) => {
    if (!localSearchQuery.trim()) return true;
    return m.content.toLowerCase().includes(localSearchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg min-w-0 relative">
      {activeChat ? (
        <>
          {/* Header */}
          <ChatHeader
            onToggleRightSidebar={onToggleRightSidebar}
            onSearchInChat={() => setShowLocalSearch(!showLocalSearch)}
          />

          {/* Local chat searching panel */}
          {showLocalSearch && (
            <div className="bg-dark-panel p-3 border-b border-neutral-900 flex items-center justify-between gap-4 select-none">
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Search text in messages..."
                className="flex-1 px-3 py-1.5 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowLocalSearch(false);
                  setLocalSearchQuery('');
                }}
                className="p-1 hover:bg-neutral-800 rounded-lg text-dark-secondary hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div
            ref={feedContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative bg-[#0b141a]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.035) 1.2px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          >
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
                <MessageBubble
                  key={msg._id}
                  msg={msg}
                  onReact={handleReact}
                  onStar={handleStar}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  onEdit={(m) => setEditingMessage(m)}
                  onReply={(m) => setReplyingTo(m)}
                  onReport={handleInitiateReport}
                />
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-dark-secondary">
                {localSearchQuery ? 'No search results match query.' : 'No messages in this chat. Start typing!'}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Real-time Typing alert status bubble */}
          {typingString && (
            <div className="px-6 py-1 bg-dark-bg flex items-center gap-1.5 select-none text-[10px] text-emerald-400 font-bold shrink-0 animate-fade-in absolute bottom-16 left-4 bg-dark-panel border border-neutral-900 shadow-xl rounded-full z-10 pr-3">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
              <span>{typingString}</span>
            </div>
          )}

          {/* Scroll bottom utility helper floating trigger */}
          {showScrollBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-20 right-6 p-2.5 rounded-full bg-dark-panel border border-neutral-800 text-dark-secondary hover:text-white shadow-2xl hover:scale-105 transition-all z-25 animate-fade-in"
            >
              <ArrowDown className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Input control panel */}
          <ChatInput
            onSendMessage={handleSendMessage}
            replyingTo={replyingTo}
            onClearReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onClearEdit={() => setEditingMessage(null)}
            onSendEditedText={handleSendEditedText}
          />
        </>
      ) : (
        /* Empty Welcoming Screen */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-dark-bg relative select-none">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-extrabold text-slate-950 text-5xl mb-6 shadow-2xl shadow-emerald-500/10">
            P
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">PChat Desktop</h2>
          <p className="text-sm text-dark-secondary max-w-sm mb-6 leading-relaxed">
            Connect. Chat. Instantly. Select an existing conversation or search profiles in the left menu to start messaging.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-dark-secondary font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active Session Secure
          </div>
        </div>
      )}
      {showReportModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-panel border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Report Message</h3>
            <p className="text-xs text-dark-secondary mb-4">
              Please select a reason why you are reporting this message to administrators.
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-2.5 bg-dark-input text-sm text-white rounded-lg focus:outline-none border border-neutral-800 focus:border-dark-accent mb-4 cursor-pointer"
            >
              <option value="Spam / Advertising">Spam / Advertising</option>
              <option value="Harassment / Hate Speech">Harassment / Hate Speech</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Other">Other</option>
            </select>
            {reportReason === 'Other' && (
              <textarea
                value={reportCustomReason}
                onChange={(e) => setReportCustomReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full p-2.5 bg-dark-input text-sm text-white rounded-lg focus:outline-none border border-neutral-800 focus:border-dark-accent mb-4 resize-none"
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportingMessageId(null);
                }}
                className="px-4 py-2 hover:bg-neutral-800 text-sm text-dark-secondary hover:text-white rounded-lg transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatArea;
