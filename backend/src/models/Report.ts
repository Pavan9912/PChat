import { Schema, model, Document } from 'mongoose';

export interface IReport extends Document {
  reporter: Schema.Types.ObjectId;
  type: 'user' | 'group' | 'message';
  reportedUser?: Schema.Types.ObjectId;
  reportedGroup?: Schema.Types.ObjectId;
  reportedMessage?: Schema.Types.ObjectId;
  reportedMessageModelName?: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['user', 'group', 'message'], required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedGroup: { type: Schema.Types.ObjectId, ref: 'Chat' },
    reportedMessage: { type: Schema.Types.ObjectId, refPath: 'reportedMessageModelName' },
    reportedMessageModelName: { type: String },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

export const Report = model<IReport>('Report', ReportSchema);
