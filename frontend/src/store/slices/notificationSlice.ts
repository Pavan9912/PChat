import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserSummary } from './chatSlice';

export interface INotification {
  _id: string;
  recipient: string;
  sender?: UserSummary;
  type: 'friend_request' | 'friend_accept' | 'group_invite' | 'message_mention' | 'admin_alert';
  content: string;
  isRead: boolean;
  chat?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    fetchNotificationsSuccess: (state, action: PayloadAction<INotification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    addNotification: (state, action: PayloadAction<INotification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
    markAsReadSuccess: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n._id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  fetchNotificationsSuccess,
  addNotification,
  markAllAsRead,
  markAsReadSuccess,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
