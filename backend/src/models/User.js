import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, SKILL_LEVELS, GOALS, AVAILABILITY, EXPERIENCE } from '../utils/constants.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  avatar: { type: String, default: '' },
  headline: { type: String, default: '', maxlength: 120 },
  bio: { type: String, default: '', maxlength: 1000 },
  role: { type: String, enum: ROLES, default: 'Developer' },
  skills: [{ name: { type: String, trim: true }, level: { type: String, enum: SKILL_LEVELS, default: 'Intermediate' } }],
  interests: [String],
  lookingFor: [String],
  goals: [{ type: String, enum: GOALS }],
  experienceLevel: { type: String, enum: EXPERIENCE, default: 'Student' },
  availability: { type: String, enum: AVAILABILITY, default: 'Flexible' },
  location: { city: String, country: String },
  remoteOk: { type: Boolean, default: true },
  links: { github: String, linkedin: String, portfolio: String },
  onboardingComplete: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function (password) { return bcrypt.compare(password, this.password); };

export default mongoose.model('User', userSchema);
