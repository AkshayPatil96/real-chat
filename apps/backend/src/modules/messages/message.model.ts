import mongoose, { Schema } from "mongoose";
import { IMessage } from "./message.interface.js";

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "file", "video", "audio"],
      default: "text",
      index: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      required: function () {
        return this.type === "text";
      },
    },

    media: {
      url: String,
      mimeType: String,
      size: Number,
      name: String,
    },

    deliveryState: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// --------------------
// Indexes
// --------------------

// Load messages in a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Media queries (for media viewer/tabs)
MessageSchema.index({ conversationId: 1, type: 1, createdAt: -1 });

// Efficient unread queries
MessageSchema.index({ conversationId: 1, readBy: 1 });

// Soft delete awareness
MessageSchema.index({ deletedAt: 1 });

// Cursor-based pagination (newest → oldest)
// Supports efficient queries: WHERE createdAt < ? OR (createdAt = ? AND _id < ?)
MessageSchema.index({ createdAt: -1, _id: -1 });

// Text search on message content (for message search feature)
MessageSchema.index({ content: 'text' });

export default mongoose.model<IMessage>("Message", MessageSchema);
