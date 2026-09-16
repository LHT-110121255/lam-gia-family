import mongoose from 'mongoose';

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      default: 'Nhà riêng',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    createdById: {
      type: String,
      required: true,
    },
    createdByName: {
      type: String,
      default: 'Thành viên',
    },
    createdByAvatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Place = mongoose.model('Place', placeSchema);
