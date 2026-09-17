import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, default: 'room-all' },
    senderId: { type: String, required: true },
    senderName: String,
    senderAvatar: String,
    text: String,
    mediaUrl: String,
    isPriorityPing: { type: Boolean, default: false }, // Tin khẩn cấp
    isPinned: { type: Boolean, default: false },
    reactions: [
      {
        emoji: String,
        memberId: String,
      },
    ],
    readBy: [{ type: String }],
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
