import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  message: { type: String, maxlength: 500, default: '' }
}, { timestamps: true });
schema.index({ requester: 1, recipient: 1 }, { unique: true });
export default mongoose.model('Connection', schema);
