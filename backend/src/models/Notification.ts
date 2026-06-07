import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: Schema.Types.ObjectId;
  sender?: Schema.Types.ObjectId;
  type: 'friend_request' | 'friend_accept' | 'group_invite' | 'message_mention' | 'admin_alert';
  content: string;
  isRead: boolean;
  chat?: Schema.Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['friend_request', 'friend_accept', 'group_invite', 'message_mention', 'admin_alert'],
      required: true,
    },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = model<INotification>('Notification', NotificationSchema);
