import mongoose, { Schema } from 'mongoose';
import { IUser } from './user.interface.js';

const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // URL or CDN path
      trim: true,
    },
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
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

// Efficient block checks
UserSchema.index({ _id: 1, blockedUsers: 1 });

// Optional: case-insensitive username lookup (Mongo >= 3.4)
UserSchema.index(
  { username: 1 },
  { collation: { locale: "en", strength: 2 } }
);

export default mongoose.model<IUser>('User', UserSchema);
