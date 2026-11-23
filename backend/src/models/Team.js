import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, maxlength: 1000, default: '' },
  hackathon: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  invites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  openRoles: [String]
}, { timestamps: true });
export default mongoose.model('Team', schema);
