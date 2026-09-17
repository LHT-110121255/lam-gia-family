import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['all', 'parent', 'children', 'custom', 'direct'],
      default: 'custom',
    },
    memberIds: [{ type: String }],
    createdById: { type: String },
    avatar: { type: String, default: '' },
    description: { type: String, default: '' },
    pinnedMessageText: { type: String, default: '' },
    pinnedMessageId: { type: String, default: '' },
    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
