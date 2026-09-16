import mongoose from 'mongoose';

const albumPhotoSchema = new mongoose.Schema({
  id: { type: String },
  url: { type: String, required: true },
  caption: { type: String, default: '' },
  date: { type: String, default: () => new Date().toISOString() },
  taggedMemberIds: [{ type: String }],
});

const albumSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    category: {
      type: String,
      default: 'Kỷ niệm',
    },
    coverUrl: { type: String, default: '' },
    photoCount: { type: Number, default: 0 },
    photos: [albumPhotoSchema],
    createdById: { type: String },
  },
  { timestamps: true }
);

albumSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  this.photoCount = this.photos ? this.photos.length : 0;
  next();
});

export const Album = mongoose.model('Album', albumSchema);
