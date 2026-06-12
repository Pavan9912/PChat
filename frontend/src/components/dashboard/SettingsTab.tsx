import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, Moon, Sun, Lock, ShieldAlert, Trash2, Check, AlertTriangle, User } from 'lucide-react';
import { RootState } from '../../store';
import { updateUserSuccess, updateAvatarSuccess, logoutSuccess } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { useSocket } from '../../context/SocketContext';

export const SettingsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);
  const { socket } = useSocket();



  // Profile forms state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Security password forms state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Blocked users list
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch blocked users and populate inputs
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setUsername(user.username);
    setBio(user.bio);
    setStatusMessage(user.statusMessage);

    // Fetch full profiles of blocked users
    const fetchBlocked = async () => {
      try {
        const res = await fetch(`${apiHost}/api/friends/blocked`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setBlockedUsers(data);
        }
      } catch (err) {
        console.error('Fetch blocked users error:', err);
      }
    };
    fetchBlocked();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch(`${apiHost}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name, username, bio, statusMessage }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      dispatch(updateUserSuccess(data));
      setProfileMsg({ text: 'Profile updated successfully!', error: false });
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Failed to update profile', error: true });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${apiHost}/api/users/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      dispatch(updateAvatarSuccess(data.avatar));
      alert('Avatar uploaded successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload avatar');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ text: 'New passwords do not match', error: true });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch(`${apiHost}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPassMsg({ text: 'Password updated successfully!', error: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMsg({ text: err.message || 'Failed to change password', error: true });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleUnblock = async (targetUserId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/friends/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();
      if (res.ok) {
        setBlockedUsers(blockedUsers.filter((u) => u._id !== targetUserId));
        alert('User unblocked successfully.');
      }
    } catch (err) {
      console.error('Unblock user error:', err);
    }
  };

  const handleDeleteAccount = async () => {
    const doubleConfirm = confirm(
      'WARNING: Are you absolutely sure you want to delete your PChatNow account? This action is permanent and cannot be undone.'
    );
    if (!doubleConfirm) return;

    try {
      const res = await fetch(`${apiHost}/api/users/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(logoutSuccess());
        alert('Your account has been deleted successfully.');
        window.location.href = '/';
      } else {
        alert(data.message || 'Failed to delete account');
      }
    } catch (err: any) {
      console.error('Delete account error:', err);
      alert(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header */}
      <div className="p-4 border-b border-neutral-900">
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Settings Form sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Avatar Upload */}
        <div className="flex flex-col items-center py-4 bg-dark-input/20 border border-neutral-900 rounded-2xl relative">
          <div className="relative group cursor-pointer w-24 h-24 mb-4">
            {user?.avatar ? (
              <img
                src={user.avatar.startsWith('/') ? `${apiHost}${user.avatar}` : user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-neutral-800"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-3xl border border-neutral-700">
                {user?.name.charAt(0)}
              </div>
            )}
            <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 mb-1" />
              Upload Image
              <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
            </label>
          </div>
          <h2 className="text-base font-bold text-white">{user?.name}</h2>
          <span className="text-xs text-dark-secondary">@{user?.username}</span>
        </div>

        {/* Preference Settings */}
        <div className="p-4 border border-neutral-900 bg-dark-input/10 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest">Preferences</h3>
          
          <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3.5">
            <span className="text-sm font-semibold text-white">Application Theme</span>
            <button
              onClick={() => dispatch(toggleTheme())}
              className="py-1.5 px-3 bg-dark-input hover:bg-neutral-800 border border-neutral-800 text-sm font-bold text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {mode === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  Light Theme
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  Dark Theme
                </>
              )}
            </button>
          </div>


        </div>

        {/* Profile Details Edit */}
        <form onSubmit={handleUpdateProfile} className="p-4 border border-neutral-900 bg-dark-input/10 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest mb-2">Profile Details</h3>
          
          {profileMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-1.5 ${
                profileMsg.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {profileMsg.error ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              About Bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              Custom Status
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. Focus coding, Out for lunch..."
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="w-full py-2 bg-dark-accent hover:opacity-90 text-slate-950 font-bold rounded-lg text-xs transition-opacity"
          >
            {isUpdatingProfile ? 'Saving Details...' : 'Save Profile Details'}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="p-4 border border-neutral-900 bg-dark-input/10 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Security & Credentials
          </h3>

          {passMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-1.5 ${
                passMsg.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {passMsg.error ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{passMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-secondary uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-dark-input text-xs text-white rounded-lg focus:outline-none border border-transparent focus:border-dark-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPass}
            className="w-full py-2 bg-dark-accent hover:opacity-90 text-slate-950 font-bold rounded-lg text-xs transition-opacity"
          >
            {isChangingPass ? 'Updating Password...' : 'Change Password'}
          </button>
        </form>

        {/* Block List management */}
        {blockedUsers.length > 0 && (
          <div className="p-4 border border-neutral-900 bg-dark-input/10 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest">Blocked Users</h3>
            <div className="space-y-2.5">
              {blockedUsers.map((bUser) => (
                <div key={bUser._id} className="flex items-center justify-between p-3.5 bg-dark-input/20 border border-neutral-900 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {bUser.avatar ? (
                        <img
                          src={bUser.avatar.startsWith('/') ? `${apiHost}${bUser.avatar}` : bUser.avatar}
                          alt={bUser.name}
                          className="w-9 h-9 rounded-lg object-cover animate-fade-in"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-xs animate-fade-in">
                          {bUser.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-white font-semibold block truncate">{bUser.name}</span>
                      <span className="text-[10px] text-dark-secondary block truncate mt-0.5">@{bUser.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(bUser._id)}
                    className="px-3 py-1.5 rounded bg-neutral-850 hover:bg-neutral-800 text-[10px] font-bold text-white border border-neutral-800 hover:border-neutral-700 transition-all select-none"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Account */}
        <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-dark-secondary leading-relaxed">
            Deleting your account will erase your conversations, group memberships, and profile details permanently.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete PChatNow Account
          </button>
        </div>

      </div>
    </div>
  );
};
export default SettingsTab;
