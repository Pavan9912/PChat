import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, UserPlus, Check, X, MessageSquare, Shield, UserMinus, Clock } from 'lucide-react';
import { RootState } from '../../store';
import {
  friendStart,
  fetchFriendsSuccess,
  fetchRequestsSuccess,
  friendFailure,
  addFriend,
  removeFriend,
  removeFriendRequest,
} from '../../store/slices/friendSlice';
import { setActiveChat, addChat } from '../../store/slices/chatSlice';
import { UserSummary } from '../../store/slices/chatSlice';

interface FriendsTabProps {
  setActiveTab: (tab: string) => void;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({ setActiveTab }) => {
  const dispatch = useDispatch();
  const { friends, requests, isLoading } = useSelector((state: RootState) => state.friend);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'requests' | 'add'>('list');

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch Friends and Requests
  const loadFriendshipData = async () => {
    dispatch(friendStart());
    try {
      // 1. Fetch friends list
      const friendsRes = await fetch(`${apiHost}/api/friends`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const friendsData = await friendsRes.json();
      if (friendsRes.ok) {
        dispatch(fetchFriendsSuccess(friendsData));
      }

      // 2. Fetch pending requests
      const reqRes = await fetch(`${apiHost}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const reqData = await reqRes.json();
      if (reqRes.ok) {
        dispatch(fetchRequestsSuccess(reqData));
      }
    } catch (err: any) {
      dispatch(friendFailure(err.message || 'Failed to load friendship data'));
    }
  };

  useEffect(() => {
    loadFriendshipData();
  }, [dispatch]);

  // Search users to add as friend
  useEffect(() => {
    if (activeSubTab !== 'add' || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${apiHost}/api/users/search?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search user error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(searchDebounce);
  }, [searchQuery, activeSubTab]);

  const handleSendRequest = async (recipientId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Friend request sent!');
        // Remove from search results or disable button
        setSearchResults((prev) => prev.filter((u) => u._id !== recipientId));
      } else {
        alert(data.message || 'Failed to send request');
      }
    } catch (err) {
      console.error('Send request error:', err);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/friends/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(removeFriendRequest(requestId));
        loadFriendshipData(); // Refresh list to fetch populated friend details
      }
    } catch (err) {
      console.error('Accept request error:', err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/friends/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ requestId }),
      });
      if (res.ok) {
        dispatch(removeFriendRequest(requestId));
      }
    } catch (err) {
      console.error('Reject request error:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
      const res = await fetch(`${apiHost}/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        dispatch(removeFriend(friendId));
      }
    } catch (err) {
      console.error('Remove friend error:', err);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to block this user? You will no longer receive their messages.')) return;
    try {
      const res = await fetch(`${apiHost}/api/friends/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        dispatch(removeFriend(targetUserId));
        alert('User blocked successfully.');
      }
    } catch (err) {
      console.error('Block user error:', err);
    }
  };

  const handleStartChatWithFriend = async (friendId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ recipientId: friendId }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(addChat(data));
        dispatch(setActiveChat(data));
        setActiveTab('chats');
      }
    } catch (err) {
      console.error('Start chat error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header Tabs */}
      <div className="p-4 border-b border-neutral-900 pb-0">
        <h1 className="text-xl font-bold text-white mb-4">Friends</h1>
        <div className="flex gap-2 border-b border-neutral-900 text-sm font-semibold">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              activeSubTab === 'list'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            All Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`pb-3 px-2 border-b-2 transition-colors relative ${
              activeSubTab === 'requests'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Pending ({requests.length})
            {requests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-dark-accent text-slate-950 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('add')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              activeSubTab === 'add'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Add Friend
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'list' && (
          <div className="space-y-2">
            {friends.length > 0 ? (
              friends.map((friend) => (
                <div
                  key={friend._id}
                  className="flex items-center justify-between p-3 bg-dark-input/30 border border-neutral-900 hover:border-neutral-800 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar.startsWith('/') ? `${apiHost}${friend.avatar}` : friend.avatar}
                          alt={friend.name}
                          className="w-11 h-11 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-sm">
                          {friend.name.charAt(0)}
                        </div>
                      )}
                      {friend.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-white truncate">{friend.name}</div>
                      <div className="text-xs text-dark-secondary truncate">
                        {friend.isOnline ? 'Active now' : 'Offline'}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartChatWithFriend(friend._id)}
                      title="Send Message"
                      className="p-2 rounded-lg bg-dark-input hover:bg-neutral-800 text-dark-accent transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleBlockUser(friend._id)}
                      title="Block User"
                      className="p-2 rounded-lg bg-dark-input hover:bg-red-500/10 text-dark-secondary hover:text-red-400 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend._id)}
                      title="Remove Friend"
                      className="p-2 rounded-lg bg-dark-input hover:bg-red-500/10 text-dark-secondary hover:text-red-400 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-dark-secondary">
                You haven't added any friends yet. Select "Add Friend" tab above to start.
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'requests' && (
          <div className="space-y-2">
            {requests.length > 0 ? (
              requests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between p-3 bg-dark-input/30 border border-neutral-900 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {req.sender.avatar ? (
                      <img
                        src={req.sender.avatar.startsWith('/') ? `${apiHost}${req.sender.avatar}` : req.sender.avatar}
                        alt={req.sender.name}
                        className="w-11 h-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-sm">
                        {req.sender.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-white">{req.sender.name}</div>
                      <div className="text-xs text-dark-secondary">@{req.sender.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAcceptRequest(req._id)}
                      title="Accept Request"
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req._id)}
                      title="Decline Request"
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-dark-secondary">
                No pending friend requests at the moment.
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'add' && (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users to add by name/username..."
                className="w-full pl-10 pr-4 py-2.5 bg-dark-input text-sm text-white rounded-xl focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
              />
              <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-dark-secondary" />
            </div>

            <div className="space-y-1">
              {searchQuery.trim() ? (
                isSearching ? (
                  <div className="text-center py-6 text-sm text-dark-secondary">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((userRes) => (
                    <div
                      key={userRes._id}
                      className="flex items-center justify-between p-3 hover:bg-dark-panelHover/40 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {userRes.avatar ? (
                          <img
                            src={userRes.avatar.startsWith('/') ? `${apiHost}${userRes.avatar}` : userRes.avatar}
                            alt={userRes.name}
                            className="w-11 h-11 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-sm">
                            {userRes.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-sm text-white">{userRes.name}</div>
                          <div className="text-xs text-dark-secondary">@{userRes.username}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendRequest(userRes._id)}
                        className="py-1.5 px-3 bg-dark-accent hover:opacity-90 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Friend
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-dark-secondary">No users found matching query</div>
                )
              ) : (
                <div className="text-center py-12 text-xs text-dark-secondary px-6">
                  Search user profiles above to send them a friend invite code.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default FriendsTab;
