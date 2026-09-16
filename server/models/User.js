import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      default: 'Thành viên',
    },
    role: {
      type: String,
      enum: ['admin', 'elder', 'parent', 'adult', 'teen', 'child'],
      default: 'adult',
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: 'male',
    },
    avatar: {
      type: String,
    },
    birthDate: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    generation: {
      type: Number,
      default: 2,
    },
    jobTitle: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: 'số tre, Tiểu Cần, Vĩnh Long',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isSeniorMode: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: 'Ở nhà',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      updatedAt: Date,
    },
    refreshTokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    pushSubscriptions: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String,
        },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save hook: Set default avatar and hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.avatar) {
    this.avatar =
      this.gender === 'female'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';
  }

  // Hash password using bcrypt if new or modified
  if (this.isModified('password')) {
    // Check if password is already a bcrypt hash (e.g. from seed or manual migration)
    const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
    if (!isBcrypt) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;

  // Handle bcrypt hash comparison
  const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
  if (isBcrypt) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Fallback for legacy unhashed passwords: compare plaintext and auto-migrate
  if (this.password === candidatePassword) {
    // Upgrade to bcrypt on next save
    this.password = candidatePassword;
    await this.save();
    return true;
  }

  return false;
};

// Return safe user object without sensitive fields
userSchema.methods.toAuthJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

export const User = mongoose.model('User', userSchema);
