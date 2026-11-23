import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Hackathon from '../models/Hackathon.js';
import Connection from '../models/Connection.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import usersData from './users.data.js';
import hackathonsData from './hackathons.data.js';

await connectDB();
try {
  await Promise.all([User.deleteMany({}), Hackathon.deleteMany({}), Connection.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}), Team.deleteMany({}), Notification.deleteMany({})]);
  const users = await User.create([
    { ...usersData[0], name: 'Demo Founder', email: 'demo@cofounder.ai', headline: 'Building the future, together' },
    ...usersData
  ]);
  const hackathons = await Hackathon.insertMany(hackathonsData);
  const [demo, teammate, designer, third] = users;
  const accepted = await Connection.create({ requester: demo.id, recipient: teammate.id, status: 'accepted', message: 'Let’s build together!' });
  await Connection.create({ requester: designer.id, recipient: demo.id, message: 'Interested in your project?' });
  await Connection.create({ requester: demo.id, recipient: third.id, message: 'Would love to connect.' });
  const conversation = await Conversation.create({ participants: [demo.id, teammate.id] });
  const message = await Message.create({ conversation: conversation.id, sender: teammate.id, text: 'Hi! Excited to explore ideas together.', readBy: [teammate.id] });
  conversation.lastMessage = message.id;
  await conversation.save();
  await Message.create({ conversation: conversation.id, sender: demo.id, text: 'Likewise! What are you working on?', readBy: [demo.id] });
  await Team.create({ name: 'Launch Crew', description: 'A team for bold ideas.', hackathon: hackathons[0].id, owner: demo.id, members: [demo.id, teammate.id], invites: [third.id], openRoles: ['Designer', 'Data/AI'] });
  await Notification.insertMany([
    { user: demo.id, type: 'connection_request', data: { connectionId: accepted.id, name: teammate.name } },
    { user: demo.id, type: 'team_invite', data: { teamName: 'Launch Crew', from: teammate.name } },
    { user: teammate.id, type: 'connection_accepted', data: { name: demo.name } }
  ]);
  console.log('Seed complete. Demo login: demo@cofounder.ai / Password@123');
} finally {
  await mongoose.disconnect();
}
