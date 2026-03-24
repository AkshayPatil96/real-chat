import mongoose, { Schema } from 'mongoose';
import { IChatRequest } from './chat-request.interface.js';

const ChatRequestSchema = new Schema<IChatRequest>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// --------------------
// Indexes
// --------------------

// Prevent duplicate requests (A → B)
ChatRequestSchema.index(
  { senderId: 1, receiverId: 1 },
  { unique: true }
);

// Fast inbox lookup
ChatRequestSchema.index({ receiverId: 1, status: 1, createdAt: -1 });

// Sender history
ChatRequestSchema.index({ senderId: 1, createdAt: -1 });

export default mongoose.model<IChatRequest>('ChatRequest', ChatRequestSchema);
