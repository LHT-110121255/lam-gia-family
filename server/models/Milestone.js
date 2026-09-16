import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    id: { type: String },
    year: { type: Number, required: true },
    date: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    photos: [{ type: String }],
    taggedMemberIds: [{ type: String }],
    aiStorySummary: { type: String },
    createdById: { type: String },
  },
  { timestamps: true }
);

milestoneSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Milestone = mongoose.model('Milestone', milestoneSchema);
