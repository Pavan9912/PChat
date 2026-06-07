import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserSummary } from './chatSlice';

export interface IAnalytics {
  totalUsers: number;
  onlineUsers: number;
  totalMessages: number;
  totalGroups: number;
  pendingReports: number;
  newUsersLastWeek: number;
  newMessagesLastWeek: number;
}

export interface IReport {
  _id: string;
  reporter: { _id: string; name: string; username: string };
  type: 'user' | 'group' | 'message';
  reportedUser?: UserSummary;
  reportedGroup?: { _id: string; name: string; avatar?: string; description?: string };
  reportedMessage?: { _id: string; content: string; sender: { _id: string; name: string; username: string } };
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

interface AdminState {
  analytics: IAnalytics | null;
  users: UserSummary[];
  reports: IReport[];
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  analytics: null,
  users: [],
  reports: [],
  totalPages: 1,
  currentPage: 1,
  isLoading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    adminStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchAnalyticsSuccess: (state, action: PayloadAction<IAnalytics>) => {
      state.isLoading = false;
      state.analytics = action.payload;
    },
    fetchUsersSuccess: (
      state,
      action: PayloadAction<{ users: UserSummary[]; currentPage: number; totalPages: number }>
    ) => {
      state.isLoading = false;
      state.users = action.payload.users;
      state.currentPage = action.payload.currentPage;
      state.totalPages = action.payload.totalPages;
    },
    fetchReportsSuccess: (state, action: PayloadAction<IReport[]>) => {
      state.isLoading = false;
      state.reports = action.payload;
    },
    updateUserBanStatus: (state, action: PayloadAction<{ userId: string; isBanned: boolean }>) => {
      const userIndex = state.users.findIndex((u) => u._id === action.payload.userId);
      if (userIndex > -1) {
        state.users[userIndex].isOnline = action.payload.isBanned ? false : state.users[userIndex].isOnline;
        // Banned state would be inside users model, wait, let's cast UserSummary to include isBanned in typing
        (state.users[userIndex] as any).isBanned = action.payload.isBanned;
      }
    },
    removeUserSuccess: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter((u) => u._id !== action.payload);
    },
    resolveReportSuccess: (state, action: PayloadAction<string>) => {
      const rIndex = state.reports.findIndex((r) => r._id === action.payload);
      if (rIndex > -1) {
        state.reports[rIndex].status = 'resolved';
      }
      if (state.analytics) {
        state.analytics.pendingReports = Math.max(0, state.analytics.pendingReports - 1);
      }
    },
    adminFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const {
  adminStart,
  fetchAnalyticsSuccess,
  fetchUsersSuccess,
  fetchReportsSuccess,
  updateUserBanStatus,
  removeUserSuccess,
  resolveReportSuccess,
  adminFailure,
} = adminSlice.actions;

export default adminSlice.reducer;
