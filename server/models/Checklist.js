import mongoose from 'mongoose';

const taskItemSchema = new mongoose.Schema({
  id: { type: String },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedBy: { type: String },
  completedAt: { type: String },
  assigneeId: { type: String },
  quantity: { type: String },
});

const checklistSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    category: { type: String, default: 'khác' },
    dueDate: { type: String },
    createdById: { type: String },
    items: [taskItemSchema],
  },
  { timestamps: true }
);

checklistSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Checklist = mongoose.model('Checklist', checklistSchema);
