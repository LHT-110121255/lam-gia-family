import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String },
    type: { type: String, enum: ['in', 'out'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'Sinh hoạt' },
    memberId: { type: String },
    payerMemberId: { type: String },
    date: { type: String, default: () => new Date().toISOString() },
    note: { type: String, default: '' },
    description: { type: String, default: '' },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

transactionSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
