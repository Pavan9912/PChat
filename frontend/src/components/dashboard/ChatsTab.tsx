import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Pin, Archive, Trash2, ShieldAlert, Check, CheckCheck } from 'lucide-react';
import { RootState } from '../../store';
import { fetchChatsSuccess, fetchChatsFailure, setActiveChat, addChat, updateChat, removeChat } from '../../store/slices/chatSlice';
import { UserSummary } from '../../store/slices/chatSlice';

export const ChatsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { chats, activeChat } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Filter out archived chats for main list
  const activeChats = chats.filter((c) => !c.isArchivedBy.includes(user?._id || ''));
  const pinnedChats = activeChats.filter((c) => c.isPinnedBy.includes(user?._id || ''));
  const unpinnedChats = activeChats.filter((c) => !c.isPinnedBy.includes(user?._id || ''));

  const sortedChats = [...pinnedChats, ...unpinnedChats];

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header */}
      <div className="p-4 border-b border-neutral-900">
        <h1 className="text-xl font-bold text-white mb-4">Chats</h1>
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
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto">
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
    </div>
  );
};
export default ChatsTab;
