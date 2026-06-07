import { Schema, model, Document } from 'mongoose';

export interface IFriendRequest extends Document {
  sender: Schema.Types.ObjectId;
  recipient: Schema.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

export const FriendRequest = model<IFriendRequest>('FriendRequest', FriendRequestSchema);
