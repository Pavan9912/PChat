import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, User, Image, FileText, Pin, LogOut, Copy, UserCheck, ShieldAlert, UserMinus, Calendar, Lock } from 'lucide-react';
import { RootState } from '../../store';
import { updateChat, removeChat, setActiveChat, setChatBlockStatus } from '../../store/slices/chatSlice';
import { updateUserSuccess } from '../../store/slices/authSlice';
import { ChatLockModal } from './ChatLockModal';

interface RightSidebarProps {
  onClose: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ onClose }) => {
  const dispatch = useDispatch();
  const { activeChat, messages } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'docs'>('info');
  
  // Chat Lock states
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<'set' | 'verify' | 'disable'>('verify');

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  if (!activeChat) return null;

  const isChatLocked = activeChat.lockedBy?.includes(user?._id || '') || false;

  const handleToggleLockClick = () => {
    if (user?.hasChatLockPin) {
      setLockModalMode('verify');
    } else {
      setLockModalMode('set');
    }
    setIsLockModalOpen(true);
  };

  const handleLockSuccess = async (verifiedPin?: string) => {
    const action = isChatLocked ? 'unlock' : 'lock';
    try {
      const res = await fetch(`${apiHost}/api/chats/${activeChat._id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ pin: verifiedPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      dispatch(updateChat(data));

      if (action === 'lock') {
        dispatch(setActiveChat(null));
        onClose();
        alert('Chat locked and hidden successfully.');
      } else {
        alert('Chat unlocked successfully.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update chat lock status');
    }
  };

  const getPartnerProfile = () => {
    if (activeChat.isGroupChat) return null;
    return activeChat.participants.find((p) => p._id !== user?._id);
  };

  const partner = getPartnerProfile();
  const isPartnerBlocked = user?.blockedUsers?.includes(partner?._id || '') || activeChat.hasBlockedPartner || false;
  const isAdmin = activeChat.isGroupChat && activeChat.admins.some((id) => {
    const stringId = typeof id === 'object' ? (id as any)._id : id;
    return stringId === user?._id;
  });

  const handleCopyInvite = () => {
    if (!activeChat.inviteCode) return;
    navigator.clipboard.writeText(activeChat.inviteCode);
    alert('Group invite code copied to clipboard!');
  };

  const handlePromoteAdmin = async (userId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/chats/group/${activeChat._id}/promote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(updateChat(data));
      }
    } catch (err) {
      console.error('Promote admin error:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`${apiHost}/api/chats/group/${activeChat._id}/remove/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(updateChat(data));
      }
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group chat?')) return;
    try {
      const res = await fetch(`${apiHost}/api/chats/group/${activeChat._id}/leave`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        dispatch(removeChat(activeChat._id));
        onClose();
      }
    } catch (err) {
      console.error('Leave group error:', err);
    }
  };

  const handleToggleBlock = async () => {
    if (!partner) return;
    const action = isPartnerBlocked ? 'unblock' : 'block';
    const confirmMsg = isPartnerBlocked
      ? `Are you sure you want to unblock ${partner.name}?`
      : `Are you sure you want to block ${partner.name}? They will no longer be able to message you.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${apiHost}/api/friends/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ targetUserId: partner._id }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${action} user`);

      if (user) {
        dispatch(updateUserSuccess({
          ...user,
          blockedUsers: data.blockedUsers || []
        }));
      }

      dispatch(setChatBlockStatus({
        chatId: activeChat._id,
        hasBlockedPartner: action === 'block'
      }));

      alert(`User ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`);
    } catch (err: any) {
      alert(err.message || `Failed to ${action} user`);
    }
  };

  // Filter shared media from message logs
  const sharedMedia = messages.filter((m) => m.mediaUrl && ['image', 'video', 'gif'].includes(m.messageType));
  const sharedDocs = messages.filter((m) => m.mediaUrl && m.messageType === 'document');
  const pinnedMessages = messages.filter((m) => m.isPinned);

  const getMediaUrl = (url: string) => {
    return url.startsWith('/') ? `${apiHost}${url}` : url;
  };

  return (
    <div className="w-80 border-l border-neutral-900 bg-dark-panel flex flex-col h-full shrink-0 select-none">
      
      {/* Sidebar Header */}
      <div className="h-16 px-4 border-b border-neutral-900 flex items-center justify-between">
        <span className="font-bold text-white text-sm">Contact Information</span>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-800 rounded-lg text-dark-secondary hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Detail Tab selectors */}
      <div className="flex border-b border-neutral-900 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-center border-b transition-colors ${
            activeTab === 'info'
              ? 'border-dark-accent text-dark-accent'
              : 'border-transparent text-dark-secondary hover:text-white'
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 text-center border-b transition-colors ${
            activeTab === 'media'
              ? 'border-dark-accent text-dark-accent'
              : 'border-transparent text-dark-secondary hover:text-white'
          }`}
        >
          Media ({sharedMedia.length})
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-3 text-center border-b transition-colors ${
            activeTab === 'docs'
              ? 'border-dark-accent text-dark-accent'
              : 'border-transparent text-dark-secondary hover:text-white'
          }`}
        >
          Docs ({sharedDocs.length})
        </button>
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Contact details */}
            <div className="flex flex-col items-center text-center">
              {activeChat.isGroupChat ? (
                activeChat.avatar ? (
                  <img
                    src={activeChat.avatar.startsWith('/') ? `${apiHost}${activeChat.avatar}` : activeChat.avatar}
                    alt={activeChat.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-neutral-800 mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-2xl mb-3">
                    {activeChat.name?.charAt(0)}
                  </div>
                )
              ) : partner?.avatar ? (
                <img
                  src={partner.avatar.startsWith('/') ? `${apiHost}${partner.avatar}` : partner.avatar}
                  alt={partner.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-neutral-800 mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-2xl mb-3 animate-fade-in">
                  {partner?.name.charAt(0)}
                </div>
              )}

              <h3 className="font-bold text-white text-base">
                {activeChat.isGroupChat ? activeChat.name : partner?.name}
              </h3>
              <span className="text-xs text-dark-secondary mt-0.5">
                {activeChat.isGroupChat ? 'Group Channel' : `@${partner?.username}`}
              </span>
            </div>

            {/* Description/Bio */}
            <div className="p-3 bg-dark-input/10 border border-neutral-900 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-widest block">
                {activeChat.isGroupChat ? 'Description' : 'Biography'}
              </span>
              <p className="text-xs text-white leading-relaxed">
                {activeChat.isGroupChat ? activeChat.description || 'No description provided' : partner?.bio}
              </p>
            </div>

            {/* Email/Join details for direct message partner */}
            {!activeChat.isGroupChat && partner && (
              <div className="space-y-3 p-3 border border-neutral-900 bg-dark-input/10 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <User className="w-4 h-4 text-dark-secondary" />
                  <span>{partner.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="w-4 h-4 text-dark-secondary" />
                  <span>Joined PChat on {new Date(partner.lastSeen).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Invite Links for group admins */}
            {activeChat.isGroupChat && activeChat.inviteCode && (
              <div className="p-3 border border-neutral-900 bg-dark-input/10 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-widest block">
                  Invite Link Code
                </span>
                <div className="flex items-center justify-between bg-dark-input px-3 py-1.5 rounded-lg border border-neutral-800">
                  <span className="text-xs font-mono text-white tracking-widest">{activeChat.inviteCode}</span>
                  <button
                    onClick={handleCopyInvite}
                    className="p-1 hover:bg-neutral-800 text-dark-accent rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Group Members List */}
            {activeChat.isGroupChat && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-widest block">
                  Participants ({activeChat.participants.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-neutral-900 p-2 rounded-xl">
                  {activeChat.participants.map((m) => {
                    const isMemberAdmin = activeChat.admins.some((id) => {
                      const stringId = typeof id === 'object' ? (id as any)._id : id;
                      return stringId === m._id;
                    });
                    const isSelfMember = m._id === user?._id;

                    return (
                      <div key={m._id} className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-900/40">
                        <div className="flex items-center gap-2 min-w-0">
                          {m.avatar ? (
                            <img
                              src={m.avatar.startsWith('/') ? `${apiHost}${m.avatar}` : m.avatar}
                              alt={m.name}
                              className="w-7.5 h-7.5 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-7.5 h-7.5 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-[10px]">
                              {m.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs text-white font-semibold truncate block max-w-28">{m.name}</span>
                            {isMemberAdmin && <span className="text-[9px] text-dark-accent block mt-0.5">Admin</span>}
                          </div>
                        </div>

                        {/* Admin moderator buttons */}
                        {isAdmin && !isSelfMember && (
                          <div className="flex items-center gap-1 select-none">
                            {!isMemberAdmin && (
                              <button
                                onClick={() => handlePromoteAdmin(m._id)}
                                title="Promote to Admin"
                                className="p-1 hover:bg-neutral-800 text-dark-accent rounded"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(m._id)}
                              title="Kick from Group"
                              className="p-1 hover:bg-red-500/10 text-red-400 rounded"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pinned Messages panel */}
            {pinnedMessages.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-widest block">
                  Pinned Messages ({pinnedMessages.length})
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-neutral-900 p-2 rounded-xl">
                  {pinnedMessages.map((pm) => (
                    <div key={pm._id} className="p-2 bg-dark-input/20 rounded border border-neutral-900 text-[10px] text-slate-300">
                      <span className="font-bold text-white block mb-0.5">{pm.sender.name}</span>
                      <p className="truncate">{pm.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Lock Settings */}
            <div className="p-3 border border-neutral-900 bg-dark-input/10 rounded-xl mt-4 select-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Lock Chat</span>
                    <span className="text-[10px] text-dark-secondary block mt-0.5">
                      Hide this chat using a PIN
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleToggleLockClick}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none relative ${
                    isChatLocked ? 'bg-emerald-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                      isChatLocked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Action Zone (Leave Group) */}
            {activeChat.isGroupChat && (
              <button
                onClick={handleLeaveGroup}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all mt-4"
              >
                <LogOut className="w-4 h-4" />
                Leave Group Chat
              </button>
            )}

            {/* Block/Unblock Option */}
            {!activeChat.isGroupChat && partner && (
              <button
                onClick={handleToggleBlock}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all mt-4"
              >
                <ShieldAlert className="w-4 h-4" />
                {isPartnerBlocked ? 'Unblock Contact' : 'Block Contact'}
              </button>
            )}
          </div>
        )}

        {/* Media Tab list */}
        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-2">
            {sharedMedia.length > 0 ? (
              sharedMedia.map((m) => (
                <div
                  key={m._id}
                  onClick={() => window.open(getMediaUrl(m.mediaUrl!), '_blank')}
                  className="aspect-square bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
                >
                  <img src={getMediaUrl(m.mediaUrl!)} alt="Shared file" className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-xs text-dark-secondary">
                No shared images or videos found in this chat.
              </div>
            )}
          </div>
        )}

        {/* Docs Tab list */}
        {activeTab === 'docs' && (
          <div className="space-y-2">
            {sharedDocs.length > 0 ? (
              sharedDocs.map((d) => (
                <a
                  key={d._id}
                  href={getMediaUrl(d.mediaUrl!)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2 bg-neutral-900/40 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors text-xs text-slate-300"
                >
                  <FileText className="w-4.5 h-4.5 text-dark-accent shrink-0" />
                  <span className="truncate flex-1 font-semibold">{d.fileName || 'document.pdf'}</span>
                </a>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-dark-secondary">
                No documents exchanged in this conversation yet.
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
    </div>
  );
};
export default RightSidebar;
