import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MessageSquare, Users, UserCheck, Bell, Settings, ShieldAlert, LogOut, Moon, Sun, CircleDot } from 'lucide-react';
import { RootState } from '../../store';
import { logoutSuccess } from '../../store/slices/authSlice';
import { setActiveChat } from '../../store/slices/chatSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { useNavigate } from 'react-router-dom';

interface SidebarTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);
  const { unreadCount } = useSelector((state: RootState) => state.notification);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleLogout = async () => {
    try {
      await fetch(`${apiHost}/api/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    dispatch(logoutSuccess());
    dispatch(setActiveChat(null));
    navigate('/login');
  };

  const navItems = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'status', icon: CircleDot, label: 'Status' },
    { id: 'friends', icon: UserCheck, label: 'Friends' },
    { id: 'groups', icon: Users, label: 'Groups' },
    { id: 'notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const isAdmin = user && user.role === 'admin';

  return (
    <div className="w-16 md:w-20 bg-slate-950 border-r border-neutral-900 flex flex-col items-center justify-between py-6 shrink-0 h-full">
      {/* Top logo */}
      <div className="flex flex-col items-center gap-6 w-full">
        <div 
          onClick={() => navigate('/')} 
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-black text-slate-950 text-[13px] tracking-tighter cursor-pointer shadow-lg shadow-emerald-500/10 hover:scale-105 transition-transform"
        >
          PVN
        </div>

        {/* Tab Items */}
        <nav className="flex flex-col gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative w-full py-3 rounded-xl flex items-center justify-center transition-colors group ${
                  isActive
                    ? 'bg-neutral-900 text-dark-accent'
                    : 'text-dark-secondary hover:text-white hover:bg-neutral-900/50'
                }`}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold bg-dark-accent text-slate-950 rounded-full min-w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-950 border border-neutral-800 text-xs font-semibold text-white rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap hidden md:block">
                  {item.label}
                </div>
              </button>
            );
          })}

          {/* Admin panel tab */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              title="Admin Panel"
              className={`relative w-full py-3 rounded-xl flex items-center justify-center transition-colors group ${
                activeTab === 'admin'
                  ? 'bg-neutral-900 text-indigo-400'
                  : 'text-dark-secondary hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-950 border border-neutral-800 text-xs font-semibold text-white rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap hidden md:block">
                Admin Panel
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile Details / Theme Toggle / Logout */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-10 h-10 rounded-xl hover:bg-neutral-900 text-dark-secondary hover:text-white flex items-center justify-center transition-colors"
        >
          {mode === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
        </button>

        {/* User Profile avatar */}
        {user && (
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('settings')}>
            {user.avatar ? (
              <img
                src={user.avatar.startsWith('/') ? `${apiHost}${user.avatar}` : user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-xl object-cover border border-neutral-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${user.isVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-10 h-10 rounded-xl hover:bg-red-500/10 text-dark-secondary hover:text-red-400 flex items-center justify-center transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
export default SidebarTabs;
