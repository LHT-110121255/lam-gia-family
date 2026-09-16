import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  voterIds: [{ type: String }],
});

const pollSchema = new mongoose.Schema(
  {
    id: { type: String },
    question: { type: String, required: true },
    createdById: { type: String },
    deadline: { type: String },
    allowMultiple: { type: Boolean, default: false },
    options: [pollOptionSchema],
  },
  { timestamps: true }
);

pollSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Poll = mongoose.model('Poll', pollSchema);
