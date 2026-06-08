import { Schema, model, Document } from 'mongoose';

export interface IStatus extends Document {
  user: Schema.Types.ObjectId;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  views: Schema.Types.ObjectId[];
  createdAt: Date;
  expiresAt: Date;
}

const StatusSchema = new Schema<IStatus>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['text', 'image', 'video'], required: true },
    content: { type: String },
    mediaUrl: { type: String },
    backgroundColor: { type: String, default: '#0f172a' },
    views: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Status = model<IStatus>('Status', StatusSchema);
