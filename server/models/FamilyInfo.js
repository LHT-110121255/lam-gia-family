import mongoose from 'mongoose';

const familyInfoSchema = new mongoose.Schema(
  {
    id: { type: String, default: 'family-info-main' },
    name: { type: String, default: 'Đại Gia Đình Họ Lâm' },
    motto: { type: String, default: 'Hiếu Thuận - Gắn Kết - Yêu Thương' },
    createdYear: { type: Number, default: 1980 },
    avatar: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    homeAddress: { type: String, default: 'Tiểu Cần, Trà Vinh' },
    elderCareNotes: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    ancestralHome: { type: String, default: 'Trà Vinh, Việt Nam' },
  },
  { timestamps: true }
);

export const FamilyInfo = mongoose.model('FamilyInfo', familyInfoSchema);
