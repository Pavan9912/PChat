import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserSummary {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  statusMessage: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface IReaction {
  user: {
    _id: string;
    name: string;
    username: string;
  } | string;
  emoji: string;
}

export interface IMessage {
  _id: string;
  sender: UserSummary;
  chat: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'document' | 'audio' | 'voice' | 'gif';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  deliveredTo: string[];
  readBy: string[];
  repliedTo?: IMessage;
  isPinned: boolean;
  starredBy: string[];
  reactions: IReaction[];
  deletedFor: string[];
  deletedEveryone: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IChat {
  _id: string;
  isGroupChat: boolean;
  name?: string;
  avatar?: string;
  description?: string;
  creator?: UserSummary | string;
  admins: (UserSummary | string)[];
  participants: UserSummary[];
  lastMessage?: IMessage;
  isPinnedBy: string[];
  isArchivedBy: string[];
  lockedBy: string[];
  inviteCode?: string;
  hasBlockedMe?: boolean;
  hasBlockedPartner?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TypingPayload {
  chatId: string;
  userId: string;
  username: string;
}

interface ChatState {
  chats: IChat[];
  activeChat: IChat | null;
  messages: IMessage[];
  typingUsers: { [chatId: string]: { [userId: string]: string } };
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  totalPages: number;
  currentPage: number;
  error: string | null;
  onlineUsersList: UserSummary[];
  onlineUsersCount: number;
}

const initialState: ChatState = {
  chats: [],
  activeChat: null,
  messages: [],
  typingUsers: {},
  isLoadingChats: false,
  isLoadingMessages: false,
  totalPages: 1,
  currentPage: 1,
  error: null,
  onlineUsersList: [],
  onlineUsersCount: 0,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    fetchChatsStart: (state) => {
      state.isLoadingChats = true;
    },
    fetchChatsSuccess: (state, action: PayloadAction<IChat[]>) => {
      state.isLoadingChats = false;
      state.chats = action.payload;
    },
    fetchChatsFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingChats = false;
      state.error = action.payload;
    },
    fetchMessagesStart: (state) => {
      state.isLoadingMessages = true;
    },
    fetchMessagesSuccess: (
      state,
      action: PayloadAction<{ messages: IMessage[]; currentPage: number; totalPages: number }>
    ) => {
      state.isLoadingMessages = false;
      if (action.payload.currentPage === 1) {
        state.messages = action.payload.messages;
      } else {
        // Prepend for infinite scrolling
        state.messages = [...action.payload.messages, ...state.messages];
      }
      state.currentPage = action.payload.currentPage;
      state.totalPages = action.payload.totalPages;
    },
    fetchMessagesFailure: (state, action: PayloadAction<string>) => {
      state.isLoadingMessages = false;
      state.error = action.payload;
    },
    setActiveChat: (state, action: PayloadAction<IChat | null>) => {
      state.activeChat = action.payload;
      state.messages = [];
      state.currentPage = 1;
      state.totalPages = 1;
    },
    addMessage: (state, action: PayloadAction<IMessage>) => {
      // Add message if it matches active chat
      if (state.activeChat && state.activeChat._id === action.payload.chat) {
        // Prevent duplicate loads
        if (!state.messages.some((m) => m._id === action.payload._id)) {
          state.messages.push(action.payload);
        }
      }

      // Update lastMessage in the chats list and bubble it to the top
      const chatIndex = state.chats.findIndex((c) => c._id === action.payload.chat);
      if (chatIndex > -1) {
        state.chats[chatIndex].lastMessage = action.payload;
        // Move chat to top of list
        const updatedChat = state.chats[chatIndex];
        state.chats.splice(chatIndex, 1);
        state.chats.unshift(updatedChat);
      }
    },
    updateMessage: (state, action: PayloadAction<IMessage>) => {
      // Update message in messages list
      const msgIndex = state.messages.findIndex((m) => m._id === action.payload._id);
      if (msgIndex > -1) {
        state.messages[msgIndex] = action.payload;
      }

      // If this was the last message, update the chat log lastMessage reference
      const chatIndex = state.chats.findIndex((c) => c._id === action.payload.chat);
      if (chatIndex > -1 && state.chats[chatIndex].lastMessage?._id === action.payload._id) {
        state.chats[chatIndex].lastMessage = action.payload;
      }
    },
    setTyping: (state, action: PayloadAction<TypingPayload>) => {
      const { chatId, userId, username } = action.payload;
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = {};
      }
      state.typingUsers[chatId][userId] = username;
    },
    stopTyping: (state, action: PayloadAction<{ chatId: string; userId: string }>) => {
      const { chatId, userId } = action.payload;
      if (state.typingUsers[chatId]) {
        delete state.typingUsers[chatId][userId];
      }
    },
    addChat: (state, action: PayloadAction<IChat>) => {
      if (!state.chats.some((c) => c._id === action.payload._id)) {
        state.chats.unshift(action.payload);
      }
    },
    updateChat: (state, action: PayloadAction<IChat>) => {
      const index = state.chats.findIndex((c) => c._id === action.payload._id);
      if (index > -1) {
        state.chats[index] = action.payload;
      }
      if (state.activeChat && state.activeChat._id === action.payload._id) {
        state.activeChat = action.payload;
      }
    },
    removeChat: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter((c) => c._id !== action.payload);
      if (state.activeChat && state.activeChat._id === action.payload) {
        state.activeChat = null;
        state.messages = [];
      }
    },
    setOnlineUsersData: (state, action: PayloadAction<{ onlineCount: number; users: UserSummary[] }>) => {
      state.onlineUsersList = action.payload.users;
      state.onlineUsersCount = action.payload.onlineCount;
    },
    setUserOnlineStatus: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean; lastSeen?: string; user?: UserSummary }>
    ) => {
      const { userId, isOnline, lastSeen, user } = action.payload;
      state.chats.forEach((chat) => {
        chat.participants.forEach((p) => {
          if (p._id === userId) {
            p.isOnline = isOnline;
            if (lastSeen) p.lastSeen = lastSeen;
          }
        });
      });
      if (state.activeChat) {
        state.activeChat.participants.forEach((p) => {
          if (p._id === userId) {
            p.isOnline = isOnline;
            if (lastSeen) p.lastSeen = lastSeen;
          }
        });
      }

      // Update onlineUsersList
      const index = state.onlineUsersList.findIndex((item) => item._id === userId);
      if (index > -1) {
        const wasOnline = state.onlineUsersList[index].isOnline;
        state.onlineUsersList[index] = {
          ...state.onlineUsersList[index],
          ...(user || {}),
          isOnline,
          lastSeen: lastSeen || state.onlineUsersList[index].lastSeen || new Date().toISOString(),
        };

        if (isOnline && !wasOnline) {
          state.onlineUsersCount += 1;
        } else if (!isOnline && wasOnline) {
          state.onlineUsersCount = Math.max(0, state.onlineUsersCount - 1);
        }
      } else {
        if (isOnline) {
          const u = user || (state.chats.flatMap(c => c.participants).find(p => p._id === userId));
          if (u) {
            state.onlineUsersList.push({
              ...u,
              isOnline: true,
              lastSeen: lastSeen || new Date().toISOString(),
            });
            state.onlineUsersCount += 1;
          }
        }
      }
    },
    setChatBlockStatus: (
      state,
      action: PayloadAction<{ chatId: string; hasBlockedMe?: boolean; hasBlockedPartner?: boolean }>
    ) => {
      const { chatId, hasBlockedMe, hasBlockedPartner } = action.payload;
      state.chats = state.chats.map((chat) => {
        if (chat._id === chatId) {
          if (hasBlockedMe !== undefined) chat.hasBlockedMe = hasBlockedMe;
          if (hasBlockedPartner !== undefined) chat.hasBlockedPartner = hasBlockedPartner;
        }
        return chat;
      });
      if (state.activeChat && state.activeChat._id === chatId) {
        if (hasBlockedMe !== undefined) state.activeChat.hasBlockedMe = hasBlockedMe;
        if (hasBlockedPartner !== undefined) state.activeChat.hasBlockedPartner = hasBlockedPartner;
      }
    },
    handleUserBlocked: (
      state,
      action: PayloadAction<{ blockerId: string; blockedId: string; currentUserId: string }>
    ) => {
      const { blockerId, blockedId, currentUserId } = action.payload;
      state.chats = state.chats.map((chat) => {
        if (!chat.isGroupChat) {
          const hasBlocker = chat.participants.some((p) => p._id === blockerId);
          const hasBlocked = chat.participants.some((p) => p._id === blockedId);
          if (hasBlocker && hasBlocked) {
            if (blockerId === currentUserId) {
              chat.hasBlockedPartner = true;
            } else {
              chat.hasBlockedMe = true;
            }
          }
        }
        return chat;
      });
      if (state.activeChat && !state.activeChat.isGroupChat) {
        const hasBlocker = state.activeChat.participants.some((p) => p._id === blockerId);
        const hasBlocked = state.activeChat.participants.some((p) => p._id === blockedId);
        if (hasBlocker && hasBlocked) {
          if (blockerId === currentUserId) {
            state.activeChat.hasBlockedPartner = true;
          } else {
            state.activeChat.hasBlockedMe = true;
          }
        }
      }
    },
    handleUserUnblocked: (
      state,
      action: PayloadAction<{ blockerId: string; unblockedId: string; currentUserId: string }>
    ) => {
      const { blockerId, unblockedId, currentUserId } = action.payload;
      state.chats = state.chats.map((chat) => {
        if (!chat.isGroupChat) {
          const hasBlocker = chat.participants.some((p) => p._id === blockerId);
          const hasBlocked = chat.participants.some((p) => p._id === unblockedId);
          if (hasBlocker && hasBlocked) {
            if (blockerId === currentUserId) {
              chat.hasBlockedPartner = false;
            } else {
              chat.hasBlockedMe = false;
            }
          }
        }
        return chat;
      });
      if (state.activeChat && !state.activeChat.isGroupChat) {
        const hasBlocker = state.activeChat.participants.some((p) => p._id === blockerId);
        const hasBlocked = state.activeChat.participants.some((p) => p._id === unblockedId);
        if (hasBlocker && hasBlocked) {
          if (blockerId === currentUserId) {
            state.activeChat.hasBlockedPartner = false;
          } else {
            state.activeChat.hasBlockedMe = false;
          }
        }
      }
    },
  },
});

export const {
  fetchChatsStart,
  fetchChatsSuccess,
  fetchChatsFailure,
  fetchMessagesStart,
  fetchMessagesSuccess,
  fetchMessagesFailure,
  setActiveChat,
  addMessage,
  updateMessage,
  setTyping,
  stopTyping,
  addChat,
  updateChat,
  removeChat,
  setOnlineUsersData,
  setUserOnlineStatus,
  setChatBlockStatus,
  handleUserBlocked,
  handleUserUnblocked,
} = chatSlice.actions;

export default chatSlice.reducer;
