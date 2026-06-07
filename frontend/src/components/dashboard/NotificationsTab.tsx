import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, Trash2, CheckCircle, UserPlus, ShieldAlert, Users } from 'lucide-react';
import { RootState } from '../../store';
import { clearNotifications, markAsReadSuccess } from '../../store/slices/notificationSlice';

export const NotificationsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state: RootState) => state.notification);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return (
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
        );
      case 'friend_accept':
        return (
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        );
      case 'group_invite':
        return (
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        );
      case 'admin_alert':
        return (
          <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-lg bg-neutral-800 text-slate-300 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const handleMarkAsRead = (id: string) => {
    dispatch(markAsReadSuccess(id));
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header */}
      <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        {notifications.length > 0 && (
          <button
            onClick={() => dispatch(clearNotifications())}
            title="Clear all notifications"
            className="p-2 rounded-lg bg-dark-input hover:bg-red-500/10 text-dark-secondary hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4">
        {notifications.length > 0 ? (
          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleMarkAsRead(notif._id)}
                className={`flex items-start gap-3 p-3 bg-dark-input/20 border border-neutral-900 rounded-xl cursor-pointer hover:border-neutral-800 transition-all relative group ${
                  !notif.isRead ? 'border-l-2 border-l-dark-accent' : ''
                }`}
              >
                {getNotificationIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed">{notif.content}</p>
                  <span className="text-[10px] text-dark-secondary mt-1 block">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-sm text-dark-secondary px-6 flex flex-col items-center gap-3">
            <Bell className="w-8 h-8 text-neutral-800 animate-pulse" />
            <p>No new notifications. You are all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default NotificationsTab;
