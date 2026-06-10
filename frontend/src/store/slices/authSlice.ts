import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  _id: string;
  name: string;
  username: string;
  email?: string;
  avatar: string;
  bio: string;
  statusMessage: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  hasChatLockPin?: boolean;
  blockedUsers?: string[];
  isOnline?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const getStoredUser = (): UserProfile | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

const initialState: AuthState = {
  user: getStoredUser(),
  token: getStoredToken(),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<{ user: UserProfile; token: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateUserSuccess: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    updateAvatarSuccess: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.avatar = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.token = null;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  authStart,
  authSuccess,
  authFailure,
  updateUserSuccess,
  updateAvatarSuccess,
  logoutSuccess,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
