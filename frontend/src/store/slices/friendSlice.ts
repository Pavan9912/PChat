import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserSummary } from './chatSlice';

export interface IFriendRequest {
  _id: string;
  sender: UserSummary;
  recipient: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface FriendState {
  friends: UserSummary[];
  requests: IFriendRequest[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FriendState = {
  friends: [],
  requests: [],
  isLoading: false,
  error: null,
};

const friendSlice = createSlice({
  name: 'friend',
  initialState,
  reducers: {
    friendStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchFriendsSuccess: (state, action: PayloadAction<UserSummary[]>) => {
      state.isLoading = false;
      state.friends = action.payload;
    },
    fetchRequestsSuccess: (state, action: PayloadAction<IFriendRequest[]>) => {
      state.isLoading = false;
      state.requests = action.payload;
    },
    friendFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    addFriendRequest: (state, action: PayloadAction<IFriendRequest>) => {
      if (!state.requests.some((r) => r._id === action.payload._id)) {
        state.requests.unshift(action.payload);
      }
    },
    removeFriendRequest: (state, action: PayloadAction<string>) => {
      state.requests = state.requests.filter((r) => r._id !== action.payload);
    },
    addFriend: (state, action: PayloadAction<UserSummary>) => {
      if (!state.friends.some((f) => f._id === action.payload._id)) {
        state.friends.push(action.payload);
      }
    },
    removeFriend: (state, action: PayloadAction<string>) => {
      state.friends = state.friends.filter((f) => f._id !== action.payload);
    },
    setFriendOnlineStatus: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean; lastSeen?: string }>
    ) => {
      const { userId, isOnline, lastSeen } = action.payload;
      const friend = state.friends.find((f) => f._id === userId);
      if (friend) {
        friend.isOnline = isOnline;
        if (lastSeen) friend.lastSeen = lastSeen;
      }
    },
  },
});

export const {
  friendStart,
  fetchFriendsSuccess,
  fetchRequestsSuccess,
  friendFailure,
  addFriendRequest,
  removeFriendRequest,
  addFriend,
  removeFriend,
  setFriendOnlineStatus,
} = friendSlice.actions;

export default friendSlice.reducer;
