import mongoose, { Schema } from "mongoose";
import { IConversation } from "./conversation.interface.js";

const LastMessageSchema = new Schema(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 1000, // safety for previews
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "video", "audio"],
      default: "text",
    },
    timestamp: {
      type: Date,
    },
  },
  { _id: false } // IMPORTANT: avoid nested _id
);

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      required: true,
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length >= 2,
        message: "Conversation must have at least 2 participants",
      },
    },

    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },

    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    lastMessage: {
      type: LastMessageSchema,
      default: null, // explicit empty state
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: false, // keep empty objects predictable
  }
);

// --------------------
// Indexes (intentional)
// --------------------

// Fast lookup for user conversations
ConversationSchema.index({ participants: 1, deletedAt: 1 });

// Sort conversations by activity
ConversationSchema.index({ "lastMessage.timestamp": -1 });

// Prevent duplicate direct conversations (optional but impressive)
ConversationSchema.index(
  { participants: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "direct", deletedAt: null },
  }
);

// Cursor-based pagination (newest → oldest)
// Supports efficient queries: WHERE createdAt < ? OR (createdAt = ? AND _id < ?)
ConversationSchema.index({ createdAt: -1, _id: -1 });

export default mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
