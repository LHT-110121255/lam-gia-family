import mongoose from 'mongoose';

const splitBillItemSchema = new mongoose.Schema({
  memberId: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: String },
});

const splitBillSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    date: { type: String, default: () => new Date().toISOString() },
    payerId: { type: String },
    createdBy: { type: String },
    splits: [splitBillItemSchema],
  },
  { timestamps: true }
);

splitBillSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const SplitBill = mongoose.model('SplitBill', splitBillSchema);
