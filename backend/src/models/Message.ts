import mongoose, { Schema, model, Document, Model } from 'mongoose';

export interface IReaction {
  user: Schema.Types.ObjectId;
  emoji: string;
}

export interface IMessage extends Document {
  sender: Schema.Types.ObjectId;
  chat: Schema.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'document' | 'audio' | 'voice' | 'gif';
  mediaUrl?: string;
  mediaPublicId?: string;
  fileName?: string;
  fileSize?: number;
  deliveredTo: Schema.Types.ObjectId[];
  readBy: Schema.Types.ObjectId[];
  repliedTo?: Schema.Types.ObjectId;
  repliedModelName?: string;
  isPinned: boolean;
  starredBy: Schema.Types.ObjectId[];
  reactions: IReaction[];
  deletedFor: Schema.Types.ObjectId[];
  deletedEveryone: boolean;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    content: { type: String, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'voice', 'gif'],
      default: 'text',
    },
    mediaUrl: { type: String },
    mediaPublicId: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    repliedTo: { type: Schema.Types.ObjectId, refPath: 'repliedModelName' },
    repliedModelName: { type: String },
    isPinned: { type: Boolean, default: false },
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedEveryone: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fallback default Message model to prevent import breakage
export const Message = mongoose.models.Message || model<IMessage>('Message', MessageSchema);

// Helper to get or compile a model for a specific user's message collection
export const getUserMessageModel = (userId: string): Model<IMessage> => {
  const collectionName = `messages_user_${userId}`;
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName] as Model<IMessage>;
  }
  return model<IMessage>(collectionName, MessageSchema, collectionName);
};

// Helpers to manually populate lastMessage from the user's message collection
export const populateChatsLastMessage = async (chats: any[], currentUserId: string): Promise<any[]> => {
  const userModel = getUserMessageModel(currentUserId);
  const populatedChats = [];
  for (const chat of chats) {
    const chatObj = typeof chat.toObject === 'function' ? chat.toObject() : chat;
    if (chatObj.lastMessage) {
      try {
        const lastMsg = await userModel.findById(chatObj.lastMessage)
          .populate('sender', 'name username email avatar bio statusMessage isOnline')
          .populate({
            path: 'repliedTo',
            populate: {
              path: 'sender',
              select: 'name username',
            },
          });
        chatObj.lastMessage = lastMsg || undefined;
      } catch (err) {
        console.error('Error populating lastMessage manually:', err);
        chatObj.lastMessage = undefined;
      }
    }
    populatedChats.push(chatObj);
  }
  return populatedChats;
};

export const populateChatLastMessage = async (chat: any, currentUserId: string): Promise<any> => {
  const chats = await populateChatsLastMessage([chat], currentUserId);
  return chats[0];
};

