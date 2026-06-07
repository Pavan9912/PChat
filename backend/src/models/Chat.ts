import { Schema, model, Document } from 'mongoose';

export interface IChat extends Document {
  isGroupChat: boolean;
  name?: string;
  avatar?: string;
  description?: string;
  creator?: Schema.Types.ObjectId;
  admins: Schema.Types.ObjectId[];
  participants: Schema.Types.ObjectId[];
  lastMessage?: Schema.Types.ObjectId;
  isPinnedBy: Schema.Types.ObjectId[];
  isArchivedBy: Schema.Types.ObjectId[];
  lockedBy: Schema.Types.ObjectId[];
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    isGroupChat: { type: Boolean, default: false },
    name: { type: String, trim: true },
    avatar: { type: String, default: '' },
    description: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    isPinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isArchivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lockedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    inviteCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export const Chat = model<IChat>('Chat', ChatSchema);
