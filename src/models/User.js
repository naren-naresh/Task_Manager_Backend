import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light', // Bonus feature support
  },
  pushSubscriptions: {
    type: Array,
    default: [],
  },
}, { timestamps: true });

// Password hashing middleware
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return; // Just return
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;