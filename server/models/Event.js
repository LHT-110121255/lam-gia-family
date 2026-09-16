import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    type: {
      type: String,
      default: 'other',
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    lunarDateText: { type: String, default: '' },
    time: { type: String, default: '' },
    location: { type: String, default: '' },
    participantIds: [{ type: String }],
    reminderMinutes: { type: Number, default: 60 },
    note: { type: String, default: '' },
    isLunarRecurring: { type: Boolean, default: false },
    isAnnualRecurring: { type: Boolean, default: false },
    createdById: { type: String },
    createdByName: { type: String },
    createdByAvatar: { type: String },
  },
  { timestamps: true }
);

// Map _id to id if id not present
eventSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Event = mongoose.model('Event', eventSchema);
