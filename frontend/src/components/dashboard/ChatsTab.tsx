import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Pin, Archive, Trash2, ShieldAlert, Check, CheckCheck, Lock, Unlock, ArrowLeft, Radio, X } from 'lucide-react';
import { RootState } from '../../store';
import { fetchChatsSuccess, fetchChatsFailure, setActiveChat, addChat, updateChat, removeChat, setOnlineUsersData } from '../../store/slices/chatSlice';
import { UserSummary } from '../../store/slices/chatSlice';
import { ChatLockModal } from '../chat/ChatLockModal';

const formatLastSeen = (dateString?: string) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Active now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

export const ChatsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { chats, activeChat, onlineUsersList, onlineUsersCount } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chat Lock states
  const [showLockedOnly, setShowLockedOnly] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<'set' | 'verify' | 'disable'>('verify');

  const [showOnlinePopover, setShowOnlinePopover] = useState(false);
  const [showOnlineFullPage, setShowOnlineFullPage] = useState(false);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Lock the active chat if it is locked and we exit showLockedOnly mode
  useEffect(() => {
    if (!showLockedOnly && activeChat && activeChat.lockedBy?.includes(user?._id || '')) {
      dispatch(setActiveChat(null));
    }
  }, [showLockedOnly, activeChat, user, dispatch]);

  const handleAccessLockedChats = () => {
    if (user?.hasChatLockPin) {
      setLockModalMode('verify');
    } else {
      setLockModalMode('set');
    }
    setIsLockModalOpen(true);
  };

  const handleLockSuccess = () => {
    setShowLockedOnly(true);
  };

  // Fetch chats on mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${apiHost}/api/chats`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        dispatch(fetchChatsSuccess(data));
      } catch (err: any) {
        dispatch(fetchChatsFailure(err.message || 'Failed to load chats'));
      }
    };
    fetchChats();
  }, [dispatch]);

  // Fetch online users on mount
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const res = await fetch(`${apiHost}/api/users/online`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          dispatch(setOnlineUsersData(data));
        }
      } catch (err) {
        console.error('Failed to load online users:', err);
      }
    };
    fetchOnlineUsers();
  }, [dispatch]);

  // Search users API query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${apiHost}/api/users/search?q=${searchQuery}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search users error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleStartChat = async (recipientId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      dispatch(addChat(data));
      dispatch(setActiveChat(data));
      setSearchQuery('');
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, chatId: string, isCurrentlyPinned: boolean) => {
    e.stopPropagation();
    const action = isCurrentlyPinned ? 'unpin' : 'pin';
    try {
      const res = await fetch(`${apiHost}/api/chats/${chatId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        // Fetch chats again to refresh
        const refreshedRes = await fetch(`${apiHost}/api/chats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const refreshedData = await refreshedRes.json();
        dispatch(fetchChatsSuccess(refreshedData));
      }
    } catch (err) {
      console.error('Pin toggle failed:', err);
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, chatId: string, isCurrentlyArchived: boolean) => {
    e.stopPropagation();
    const action = isCurrentlyArchived ? 'unarchive' : 'archive';
    try {
      const res = await fetch(`${apiHost}/api/chats/${chatId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        // Fetch chats again to refresh
        const refreshedRes = await fetch(`${apiHost}/api/chats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const refreshedData = await refreshedRes.json();
        dispatch(fetchChatsSuccess(refreshedData));
      }
    } catch (err) {
      console.error('Archive toggle failed:', err);
    }
  };

  // Helper to format chat details
  const getChatMetadata = (chat: any) => {
    if (chat.isGroupChat) {
      return {
        name: chat.name,
        avatar: chat.avatar,
        status: `${chat.participants.length} members`,
      };
    }

    const partner = chat.participants.find((p: any) => p._id !== user?._id);
    return {
      name: partner?.name || 'Deleted Account',
      avatar: partner?.avatar || '',
      status: partner?.isOnline ? 'online' : 'offline',
      isOnline: partner?.isOnline,
    };
  };

  const getMessageReceipt = (msg: any) => {
    if (msg.sender._id !== user?._id) return null;
    const isRead = msg.readBy.length > 1; // Read by someone other than sender
    if (isRead) {
      return <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <Check className="w-4 h-4 text-dark-secondary shrink-0" />;
  };

  const lockedChatsCount = chats.filter((c) => c.lockedBy?.includes(user?._id || '')).length;

  // Filter out archived and locked chats for main list, or show locked-only chats
  const activeChats = chats.filter((c) => {
    const isArchived = c.isArchivedBy.includes(user?._id || '');
    const isLocked = c.lockedBy?.includes(user?._id || '');
    if (showLockedOnly) {
      return isLocked;
    }
    return !isArchived && !isLocked;
  });

  const pinnedChats = activeChats.filter((c) => c.isPinnedBy.includes(user?._id || ''));
  const unpinnedChats = activeChats.filter((c) => !c.isPinnedBy.includes(user?._id || ''));

  const sortedChats = [...pinnedChats, ...unpinnedChats];

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header */}
      <div className="p-4 border-b border-neutral-900 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {showLockedOnly && (
              <button
                onClick={() => setShowLockedOnly(false)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-bold text-white">
              {showLockedOnly ? 'Locked Chats' : 'Chats'}
            </h1>
          </div>
          {!showLockedOnly && (
            <button
              onClick={() => setShowOnlinePopover(!showOnlinePopover)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all duration-200 select-none ${
                showOnlinePopover
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${showOnlinePopover ? 'animate-pulse' : ''}`} />
              <span>{onlineUsersCount} Online</span>
            </button>
          )}
        </div>
        {!showLockedOnly && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users or messages..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-input text-sm text-white rounded-xl focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
            <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-dark-secondary" />
          </div>
        )}

        {/* Dropdown Popover */}
        {showOnlinePopover && !showLockedOnly && (
          <div className="absolute right-4 top-14 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 animate-fade-in flex flex-col max-h-96">
            {/* Popover Header */}
            <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40 rounded-t-xl select-none">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Radio className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                <span>{onlineUsersCount} Users Online</span>
              </div>
              <button 
                onClick={() => setShowOnlinePopover(false)}
                className="text-xs text-dark-secondary hover:text-white transition-colors font-bold"
              >
                Close
              </button>
            </div>

            {/* Popover List */}
            <div className="flex-1 overflow-y-auto py-1.5 no-scrollbar">
              {onlineUsersList.length > 0 ? (
                onlineUsersList.map((onlineUser) => (
                  <div
                    key={onlineUser._id}
                    onClick={() => {
                      handleStartChat(onlineUser._id);
                      setShowOnlinePopover(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-850 cursor-pointer transition-colors"
                  >
                    {/* Circular Avatar */}
                    <div className="relative shrink-0 select-none">
                      {onlineUser.avatar ? (
                        <img
                          src={onlineUser.avatar.startsWith('/') ? `${apiHost}${onlineUser.avatar}` : onlineUser.avatar}
                          alt={onlineUser.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white uppercase text-sm">
                          {onlineUser.name.charAt(0)}
                        </div>
                      )}
                      {/* Status badge overlapping bottom right */}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-neutral-900 shadow-md ${
                        onlineUser.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                    </div>

                    {/* Name and active/status message */}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-xs truncate">
                        {onlineUser.name}
                      </div>
                      <div className="text-[10px] text-dark-secondary truncate mt-0.5 font-medium">
                        {onlineUser.isOnline 
                          ? (onlineUser.statusMessage || 'Active') 
                          : formatLastSeen(onlineUser.lastSeen)
                        }
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-dark-secondary">
                  No online users found
                </div>
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-950/20 rounded-b-xl flex items-center justify-between text-[11px] font-bold select-none">
              <button
                onClick={() => {
                  setShowOnlineFullPage(true);
                  setShowOnlinePopover(false);
                }}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Users Online Full Page
              </button>
              <button
                onClick={() => {
                  setShowOnlinePopover(false);
                  const searchInput = document.querySelector('input[placeholder="Search users or messages..."]') as HTMLInputElement;
                  if (searchInput) searchInput.focus();
                }}
                className="text-dark-secondary hover:text-white transition-colors"
              >
                Search Users
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto">
        {/* Online Users Horizontal Scroll */}
        {!searchQuery.trim() && onlineUsersList && onlineUsersList.length > 0 && (
          <div className="px-4 py-3 border-b border-neutral-900/60 select-none bg-neutral-950/20">
            <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-wider block mb-2.5">
              Online Now
            </span>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1.5 scroll-smooth">
              {onlineUsersList.map((onlineUser) => (
                <div
                  key={onlineUser._id}
                  onClick={() => handleStartChat(onlineUser._id)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
                >
                  <div className="relative">
                    {onlineUser.avatar ? (
                      <img
                        src={onlineUser.avatar.startsWith('/') ? `${apiHost}${onlineUser.avatar}` : onlineUser.avatar}
                        alt={onlineUser.name}
                        className="w-11 h-11 rounded-xl object-cover border border-neutral-800 group-hover:border-dark-accent transition-colors duration-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white uppercase text-sm group-hover:border-dark-accent transition-colors duration-200">
                        {onlineUser.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-lg shadow-emerald-500/20" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 group-hover:text-white transition-colors max-w-12 truncate">
                    {onlineUser.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchQuery.trim() ? (
          /* Search results view */
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-dark-secondary uppercase tracking-wider">
              Search Results
            </div>
            {isSearching ? (
              <div className="text-center py-6 text-sm text-dark-secondary">Searching users...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((searchUser) => (
                <div
                  key={searchUser._id}
                  onClick={() => handleStartChat(searchUser._id)}
                  className="flex items-center gap-3 p-3 hover:bg-dark-panelHover rounded-xl cursor-pointer transition-colors"
                >
                  <div className="relative shrink-0">
                    {searchUser.avatar ? (
                      <img
                        src={searchUser.avatar.startsWith('/') ? `${apiHost}${searchUser.avatar}` : searchUser.avatar}
                        alt={searchUser.name}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase shrink-0">
                        {searchUser.name.charAt(0)}
                      </div>
                    )}
                    {searchUser.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white text-sm truncate">{searchUser.name}</div>
                    <div className="text-xs text-dark-secondary truncate">@{searchUser.username}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-dark-secondary">No users found matching query</div>
            )}
          </div>
        ) : (
          /* Active chats view */
          <div className="p-2 space-y-0.5">
            {/* Locked Chats Access Card */}
            {lockedChatsCount > 0 && !showLockedOnly && (
              <div
                onClick={handleAccessLockedChats}
                className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-slate-900/30 hover:bg-slate-900 border border-neutral-900/80 cursor-pointer transition-colors text-slate-300 group animate-fade-in"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">Locked Chats</div>
                  <div className="text-[10px] text-dark-secondary mt-0.5">Keep conversations private and secure</div>
                </div>
                <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                  {lockedChatsCount}
                </span>
              </div>
            )}

            {sortedChats.length > 0 ? (
              sortedChats.map((chat) => {
                const meta = getChatMetadata(chat);
                const isActive = activeChat?._id === chat._id;
                const isPinned = chat.isPinnedBy.includes(user?._id || '');
                const hasLastMessage = !!chat.lastMessage;
                
                return (
                  <div
                    key={chat._id}
                    onClick={() => dispatch(setActiveChat(chat))}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors group relative ${
                      isActive ? 'bg-dark-panelHover' : 'hover:bg-dark-panelHover/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {meta.avatar ? (
                        <img
                          src={meta.avatar.startsWith('/') ? `${apiHost}${meta.avatar}` : meta.avatar}
                          alt={meta.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-lg">
                          {meta.name.charAt(0)}
                        </div>
                      )}
                      {/* Online Status marker */}
                      {!chat.isGroupChat && meta.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-sm text-white truncate">{meta.name}</span>
                        {hasLastMessage && (
                          <span className="text-[10px] text-dark-secondary whitespace-nowrap">
                            {new Date(chat.lastMessage!.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          {hasLastMessage && getMessageReceipt(chat.lastMessage)}
                          <span className="text-xs text-dark-secondary truncate">
                            {hasLastMessage ? chat.lastMessage!.content : chat.description || 'No messages yet'}
                          </span>
                        </div>

                        {/* Badges / Pin icons */}
                        <div className="flex items-center gap-1.5">
                          {isPinned && <Pin className="w-3.5 h-3.5 text-dark-accent rotate-45 shrink-0" />}
                          {/* Unread dot simulation */}
                          {/* (In production, count unread messages dynamically) */}
                        </div>
                      </div>
                    </div>

                    {/* Quick actions box on hover */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-dark-panelHover/90 pl-2 py-1.5 rounded-lg shadow-xl z-10 border border-neutral-800">
                      <button
                        onClick={(e) => handleTogglePin(e, chat._id, isPinned)}
                        title={isPinned ? 'Unpin Chat' : 'Pin Chat'}
                        className="p-1 hover:text-dark-accent text-dark-secondary transition-colors"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleToggleArchive(e, chat._id, false)}
                        title="Archive Chat"
                        className="p-1 hover:text-indigo-400 text-dark-secondary transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-sm text-dark-secondary px-6">
                No active conversations. Search a user's name above to start chatting!
              </div>
            )}
          </div>
        )}
      </div>

      <ChatLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        mode={lockModalMode}
        onSuccess={handleLockSuccess}
      />

      {/* Full Page Overlay Modal */}
      {showOnlineFullPage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40 rounded-t-2xl">
              <div className="flex items-center gap-2.5 text-white font-bold text-base">
                <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                <span>Users Online Full Page</span>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  {onlineUsersCount} Active
                </span>
              </div>
              <button
                onClick={() => setShowOnlineFullPage(false)}
                className="p-1.5 hover:bg-neutral-850 rounded-lg text-dark-secondary hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {onlineUsersList.length > 0 ? (
                onlineUsersList.map((onlineUser) => (
                  <div
                    key={onlineUser._id}
                    onClick={() => {
                      handleStartChat(onlineUser._id);
                      setShowOnlineFullPage(false);
                    }}
                    className="flex items-center justify-between p-3.5 bg-neutral-950/25 border border-neutral-900/60 hover:border-neutral-800 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0 select-none">
                        {onlineUser.avatar ? (
                          <img
                            src={onlineUser.avatar.startsWith('/') ? `${apiHost}${onlineUser.avatar}` : onlineUser.avatar}
                            alt={onlineUser.name}
                            className="w-12 h-12 rounded-full object-cover border border-neutral-800"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white uppercase text-base">
                            {onlineUser.name.charAt(0)}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-neutral-900 shadow-md ${
                          onlineUser.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {onlineUser.name}
                        </div>
                        <div className="text-xs text-dark-secondary truncate mt-0.5">
                          @{onlineUser.username}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        onlineUser.isOnline 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {onlineUser.isOnline ? 'Active Now' : 'Away'}
                      </span>
                      <span className="text-[10px] text-dark-secondary block mt-1.5 font-medium">
                        {onlineUser.isOnline 
                          ? (onlineUser.statusMessage || 'Online') 
                          : formatLastSeen(onlineUser.lastSeen)
                        }
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm text-dark-secondary">
                  No online users found in the system
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowOnlineFullPage(false)}
                className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-xs font-bold text-white rounded-xl border border-neutral-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatsTab;
