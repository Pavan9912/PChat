import { Schema, model, Document } from 'mongoose';

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
  isPinned: boolean;
  starredBy: Schema.Types.ObjectId[];
  reactions: IReaction[];
  deletedFor: Schema.Types.ObjectId[];
  deletedEveryone: boolean;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
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
    repliedTo: { type: Schema.Types.ObjectId, ref: 'Message' },
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

export const Message = model<IMessage>('Message', MessageSchema);
