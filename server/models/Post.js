import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true },
    authorName: { type: String, default: 'Thành viên' },
    authorAvatar: { type: String, default: '' },
    content: { type: String, required: true },
    feeling: { type: String, default: '' },
    location: { type: String, default: '' },
    mediaUrls: [{ type: String }], // Mảng ảnh/video đính kèm
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    likes: [{ type: String }],
    comments: [
      {
        authorId: { type: String },
        authorName: { type: String },
        authorAvatar: { type: String },
        content: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isMemoryPrompt: { type: Boolean, default: false },
    taggedUsers: [{ type: String }],
  },
  { timestamps: true }
);

export const Post = mongoose.model('Post', postSchema);
