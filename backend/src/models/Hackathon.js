import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  title: { type: String, required: true }, organizer: String, description: String,
  bannerImage: String, mode: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online' },
  location: String, startDate: Date, endDate: Date, registrationDeadline: Date,
  themes: [String], requiredSkills: [String], prizePool: String,
  teamSize: { min: { type: Number, default: 1 }, max: { type: Number, default: 4 } },
  website: String, interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
export default mongoose.model('Hackathon', schema);
