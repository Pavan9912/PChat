import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Users, Plus, Hash, Check, ArrowRight, ShieldAlert } from 'lucide-react';
import { RootState } from '../../store';
import { addChat, setActiveChat } from '../../store/slices/chatSlice';

interface GroupsTabProps {
  setActiveTab: (tab: string) => void;
}

export const GroupsTab: React.FC<GroupsTabProps> = ({ setActiveTab }) => {
  const dispatch = useDispatch();
  const { chats } = useSelector((state: RootState) => state.chat);
  const { friends } = useSelector((state: RootState) => state.friend);

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'join'>('list');

  // Create group form state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Join group state
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch(`${apiHost}/api/chats/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim(),
          participantIds: selectedFriends,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      dispatch(addChat(data));
      dispatch(setActiveChat(data));
      
      // Reset form
      setGroupName('');
      setGroupDesc('');
      setSelectedFriends([]);
      setActiveTab('chats');
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsJoining(true);
    try {
      const res = await fetch(`${apiHost}/api/chats/join/${inviteCode.trim()}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      dispatch(addChat(data.chat));
      dispatch(setActiveChat(data.chat));
      alert('Joined group successfully!');
      
      setInviteCode('');
      setActiveTab('chats');
    } catch (err: any) {
      alert(err.message || 'Failed to join group. Verify the invite code.');
    } finally {
      setIsJoining(false);
    }
  };

  const toggleSelectFriend = (id: string) => {
    if (selectedFriends.includes(id)) {
      setSelectedFriends(selectedFriends.filter((fId) => fId !== id));
    } else {
      setSelectedFriends([...selectedFriends, id]);
    }
  };

  // Filter groups from the main chats list
  const groupChats = chats.filter((c) => c.isGroupChat);

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header sub-tabs */}
      <div className="p-4 border-b border-neutral-900 pb-0">
        <h1 className="text-xl font-bold text-white mb-4">Groups</h1>
        <div className="flex gap-2 border-b border-neutral-900 text-sm font-semibold">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              activeSubTab === 'list'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            My Groups ({groupChats.length})
          </button>
          <button
            onClick={() => setActiveSubTab('create')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              activeSubTab === 'create'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Create Group
          </button>
          <button
            onClick={() => setActiveSubTab('join')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              activeSubTab === 'join'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Join Group
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'list' && (
          <div className="space-y-2">
            {groupChats.length > 0 ? (
              groupChats.map((group) => (
                <div
                  key={group._id}
                  onClick={() => {
                    dispatch(setActiveChat(group));
                    setActiveTab('chats');
                  }}
                  className="flex items-center justify-between p-3 bg-dark-input/30 border border-neutral-900 hover:border-neutral-800 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {group.avatar ? (
                      <img
                        src={group.avatar.startsWith('/') ? `${apiHost}${group.avatar}` : group.avatar}
                        alt={group.name}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-sm shrink-0">
                        {group.name?.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-white truncate">{group.name}</div>
                      <div className="text-xs text-dark-secondary truncate">
                        {group.participants.length} members
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-dark-secondary group-hover:text-dark-accent transition-colors" />
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-dark-secondary">
                You haven't joined any groups yet. Click "Create Group" or "Join Group" to start.
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'create' && (
          <form onSubmit={handleCreateGroup} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                placeholder="Product Launch Team"
                className="w-full px-4 py-2.5 bg-dark-input text-sm text-white rounded-xl focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                rows={3}
                placeholder="Talk about designs, roadmaps, and deliveries..."
                className="w-full px-4 py-2.5 bg-dark-input text-sm text-white rounded-xl focus:outline-none border border-transparent focus:border-dark-accent resize-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-3">
                Select Members (Friends list)
              </label>
              {friends.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-neutral-900 p-2 rounded-xl">
                  {friends.map((friend) => {
                    const isSelected = selectedFriends.includes(friend._id);
                    return (
                      <div
                        key={friend._id}
                        onClick={() => toggleSelectFriend(friend._id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-dark-panelHover/40' : 'hover:bg-dark-input/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {friend.avatar ? (
                            <img
                              src={friend.avatar.startsWith('/') ? `${apiHost}${friend.avatar}` : friend.avatar}
                              alt={friend.name}
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-xs">
                              {friend.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm text-white">{friend.name}</span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-dark-accent border-dark-accent text-slate-950'
                              : 'border-neutral-700 bg-transparent'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-dark-secondary bg-dark-input/20 border border-neutral-900 rounded-xl">
                  You need friends to create a group chat. Add some friends first!
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreating || !groupName.trim()}
              className="w-full py-3 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              {isCreating ? 'Creating Group...' : 'Create Group'}
            </button>
          </form>
        )}

        {activeSubTab === 'join' && (
          <form onSubmit={handleJoinGroup} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-dark-secondary uppercase tracking-wider mb-2">
                Group Invite Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  placeholder="e.g. a7b29c"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-input text-sm text-white rounded-xl focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
                />
                <Hash className="absolute left-3 top-3 w-4.5 h-4.5 text-dark-secondary" />
              </div>
              <p className="text-[10px] text-dark-secondary mt-2">
                Ask a group administrator to provide the invite code from their group info panel.
              </p>
            </div>

            <button
              type="submit"
              disabled={isJoining || !inviteCode.trim()}
              className="w-full py-3 bg-dark-accent hover:opacity-95 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              {isJoining ? 'Joining Group...' : 'Join Group'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default GroupsTab;
