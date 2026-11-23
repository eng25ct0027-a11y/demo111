import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { rateLimit } from 'express-rate-limit';
import User from '../models/User.js';
import Hackathon from '../models/Hackathon.js';
import Connection from '../models/Connection.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ROLES, INTERESTS, GOALS, AVAILABILITY, EXPERIENCE } from '../utils/constants.js';
import { rankCandidates, scoreCompatibility } from '../services/matching.service.js';
import { scoreHackathon, suggestTeammates } from '../services/recommendation.service.js';
import { emitToUser } from '../services/socket.service.js';
import { env } from '../config/env.js';

const router = Router();
const send = (res, data, message = 'OK', status = 200) => res.status(status).json({ success: true, data, message });
const validate = (req) => {
  const result = validationResult(req);
  if (!result.isEmpty()) throw new ApiError(400, result.array()[0].msg);
};
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const authCookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 86400000
};
const tokenFor = (id) => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const publicUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  if (data.avatar?.startsWith('data:')) data.avatar = `/api/users/${data._id}/avatar`;
  return data;
};
async function notify(userId, type, data) {
  const notification = await Notification.create({ user: userId, type, data });
  await emitToUser(userId, 'notification:new', notification);
  return notification;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, done) => file.mimetype.startsWith('image/') ? done(null, true) : done(new ApiError(400, 'Only image files are allowed.'))
});

router.post('/auth/register', authLimit, body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 }), asyncHandler(async (req, res) => {
  validate(req);
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, password });
  const token = tokenFor(user.id);
  res.cookie('token', token, authCookieOptions);
  send(res, { user: publicUser(user), token }, 'Account created.', 201);
}));
router.post('/auth/login', authLimit, body('email').isEmail().normalizeEmail(), body('password').notEmpty(), asyncHandler(async (req, res) => {
  validate(req);
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) throw new ApiError(401, 'Invalid email or password.');
  user.lastActive = new Date();
  await user.save();
  const token = tokenFor(user.id);
  res.cookie('token', token, authCookieOptions);
  send(res, { user: publicUser(user), token }, 'Welcome back.');
}));
router.post('/auth/logout', (req, res) => { res.clearCookie('token', authCookieOptions); send(res, null, 'Signed out.'); });
router.get('/health', (req, res) => send(res, { status: 'healthy', timestamp: new Date().toISOString() }));

router.use(requireAuth);
router.get('/auth/me', (req, res) => send(res, publicUser(req.user)));
router.get('/users/meta/options', (req, res) => send(res, { roles: ROLES, interests: INTERESTS, goals: GOALS, availability: AVAILABILITY, experience: EXPERIENCE }));
router.put('/users/me', body('name').optional().trim().notEmpty(), body('headline').optional().isLength({ max: 120 }), asyncHandler(async (req, res) => {
  validate(req);
  const fields = ['name', 'headline', 'bio', 'role', 'skills', 'interests', 'lookingFor', 'goals', 'experienceLevel', 'availability', 'location', 'remoteOk', 'links', 'avatar'];
  for (const field of fields) if (req.body[field] !== undefined) req.user[field] = req.body[field];
  await req.user.save();
  send(res, publicUser(req.user), 'Profile updated.');
}));
router.put('/users/me/onboarding', body('role').isIn(ROLES), body('headline').trim().notEmpty(), asyncHandler(async (req, res) => {
  validate(req);
  const allowed = ['role', 'headline', 'bio', 'skills', 'interests', 'lookingFor', 'goals', 'experienceLevel', 'availability', 'location', 'remoteOk', 'links'];
  for (const field of allowed) if (req.body[field] !== undefined) req.user[field] = req.body[field];
  req.user.onboardingComplete = true;
  await req.user.save();
  send(res, publicUser(req.user), 'Profile setup complete.');
}));
router.post('/users/me/avatar', upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please select an image.');
  if (process.env.VERCEL) {
    req.user.avatar = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  } else {
    const filename = `${req.user.id}-${Date.now()}${path.extname(req.file.originalname).toLowerCase()}`;
    await writeFile(path.resolve('uploads', filename), req.file.buffer);
    req.user.avatar = `/uploads/${filename}`;
  }
  await req.user.save();
  send(res, publicUser(req.user), 'Avatar updated.');
}));
router.get('/users/me/stats', asyncHandler(async (req, res) => {
  const [connections, pendingRequests, hackathons, candidates] = await Promise.all([
    Connection.countDocuments({ status: 'accepted', $or: [{ requester: req.user.id }, { recipient: req.user.id }] }),
    Connection.countDocuments({ recipient: req.user.id, status: 'pending' }),
    Hackathon.countDocuments({ interestedUsers: req.user.id }),
    User.find({ _id: { $ne: req.user.id }, onboardingComplete: true }).select('skills interests goals role availability location remoteOk experienceLevel')
  ]);
  const scored = rankCandidates(req.user, candidates);
  const scores = scored.map((item) => item.score);
  const skillDistribution = {};
  for (const skill of req.user.skills) skillDistribution[skill.level] = (skillDistribution[skill.level] || 0) + 1;
  const matchScoreDistribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const score of scores) matchScoreDistribution[score <= 20 ? '0-20' : score <= 40 ? '21-40' : score <= 60 ? '41-60' : score <= 80 ? '61-80' : '81-100']++;
  const fields = [req.user.name, req.user.headline, req.user.bio, req.user.role, req.user.skills.length, req.user.interests.length, req.user.goals.length, req.user.location?.city];
  send(res, {
    profileCompleteness: Math.round(fields.filter(Boolean).length / fields.length * 100),
    connections, pendingRequests, topMatchScore: Math.max(0, ...scores), interestedHackathons: hackathons,
    skillDistribution: Object.entries(skillDistribution).map(([name, value]) => ({ name, value })),
    matchScoreDistribution: Object.entries(matchScoreDistribution).map(([name, value]) => ({ name, value }))
  });
}));
router.get('/users/:id/avatar', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('avatar');
  if (!user?.avatar?.startsWith('data:')) throw new ApiError(404, 'Profile photo not found.');
  const [, mimeType, encoded] = user.avatar.match(/^data:([^;]+);base64,(.+)$/) || [];
  if (!mimeType || !encoded) throw new ApiError(500, 'Stored profile photo is invalid.');
  res.type(mimeType).set('Cache-Control', 'private, max-age=3600').send(Buffer.from(encoded, 'base64'));
}));
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  const connection = await Connection.findOne({ $or: [{ requester: req.user.id, recipient: user.id }, { requester: user.id, recipient: req.user.id }] });
  send(res, { user: publicUser(user), connection: connection ? { id: connection.id, status: connection.status, requester: connection.requester } : null });
}));

router.get('/matches', asyncHandler(async (req, res) => {
  const excluded = await Connection.find({ status: { $in: ['accepted', 'pending'] }, $or: [{ requester: req.user.id }, { recipient: req.user.id }] }).select('requester recipient');
  const skipIds = new Set([req.user.id, ...excluded.flatMap((item) => [item.requester.toString(), item.recipient.toString()])]);
  const query = { onboardingComplete: true, _id: { $nin: [...skipIds] } };
  if (req.query.role) query.role = req.query.role;
  if (req.query.availability) query.availability = req.query.availability;
  if (req.query.city) query['location.city'] = new RegExp(String(req.query.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.interests) query.interests = { $in: String(req.query.interests).split(',') };
  if (req.query.skills) query['skills.name'] = { $in: String(req.query.skills).split(',') };
  if (req.query.search) query.$or = [{ name: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { headline: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
  const candidates = await User.find(query).limit(1000);
  let matches = rankCandidates(req.user, candidates).filter((match) => match.score >= Number(req.query.minScore || 0));
  matches.sort(req.query.sort === 'recent' ? (a, b) => new Date(b.user.lastActive) - new Date(a.user.lastActive) : (a, b) => b.score - a.score);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const total = matches.length;
  matches = matches.slice((page - 1) * limit, page * limit).map((match) => ({ ...match, user: publicUser(match.user) }));
  send(res, { matches, total, page, pages: Math.ceil(total / limit) });
}));
router.get('/matches/:userId/compatibility', asyncHandler(async (req, res) => {
  const candidate = await User.findById(req.params.userId);
  if (!candidate) throw new ApiError(404, 'User not found.');
  send(res, scoreCompatibility(req.user, candidate));
}));

router.get('/hackathons', asyncHandler(async (req, res) => {
  const query = { registrationDeadline: { $gte: new Date() } };
  if (req.query.mode) query.mode = req.query.mode;
  if (req.query.theme) query.themes = req.query.theme;
  if (req.query.search) query.title = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const records = await Hackathon.find(query).sort({ startDate: 1 }).limit(100);
  const data = req.query.recommended === 'true'
    ? records.map((hackathon) => ({ hackathon, ...scoreHackathon(req.user, hackathon) })).sort((a, b) => b.score - a.score)
    : records;
  send(res, { hackathons: data, total: data.length });
}));
router.get('/hackathons/recommended', asyncHandler(async (req, res) => {
  const records = await Hackathon.find({ registrationDeadline: { $gte: new Date() } });
  send(res, records.map((hackathon) => ({ hackathon, ...scoreHackathon(req.user, hackathon) })).sort((a, b) => b.score - a.score));
}));
router.get('/hackathons/:id', asyncHandler(async (req, res) => {
  const record = await Hackathon.findById(req.params.id).populate('interestedUsers', 'name avatar role headline');
  if (!record) throw new ApiError(404, 'Hackathon not found.');
  send(res, record);
}));
router.post('/hackathons/:id/interest', asyncHandler(async (req, res) => {
  const record = await Hackathon.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Hackathon not found.');
  const interested = record.interestedUsers.some((id) => id.toString() === req.user.id);
  record.interestedUsers = interested ? record.interestedUsers.filter((id) => id.toString() !== req.user.id) : [...record.interestedUsers, req.user._id];
  await record.save();
  send(res, { interested: !interested });
}));
router.get('/hackathons/:id/teammates', asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.id).populate('interestedUsers');
  if (!hackathon) throw new ApiError(404, 'Hackathon not found.');
  const teammates = suggestTeammates(req.user, hackathon, hackathon.interestedUsers);
  send(res, teammates.map((item) => ({ ...item, user: publicUser(item.user) })));
}));

router.post('/connections/:userId', body('message').optional().isLength({ max: 500 }), asyncHandler(async (req, res) => {
  validate(req);
  if (req.params.userId === req.user.id) throw new ApiError(400, 'You cannot connect with yourself.');
  const recipient = await User.findById(req.params.userId);
  if (!recipient) throw new ApiError(404, 'User not found.');
  let connection = await Connection.findOne({ $or: [{ requester: req.user.id, recipient: recipient.id }, { requester: recipient.id, recipient: req.user.id }] });
  if (connection) {
    if (connection.status === 'rejected') {
      connection.requester = req.user._id; connection.recipient = recipient._id; connection.status = 'pending'; connection.message = req.body.message || '';
      await connection.save();
    } else throw new ApiError(409, 'A connection request or connection already exists.');
  } else connection = await Connection.create({ requester: req.user.id, recipient: recipient.id, message: req.body.message || '' });
  await notify(recipient.id, 'connection_request', { connectionId: connection.id, from: req.user.id, name: req.user.name });
  send(res, connection, 'Connection request sent.', 201);
}));
router.get('/connections', asyncHandler(async (req, res) => {
  const records = await Connection.find({ status: 'accepted', $or: [{ requester: req.user.id }, { recipient: req.user.id }] }).populate('requester recipient', 'name email avatar headline role skills interests');
  send(res, records);
}));
router.get('/connections/requests/received', asyncHandler(async (req, res) => send(res, await Connection.find({ recipient: req.user.id, status: 'pending' }).populate('requester', 'name avatar headline role skills'))));
router.get('/connections/requests/sent', asyncHandler(async (req, res) => send(res, await Connection.find({ requester: req.user.id, status: 'pending' }).populate('recipient', 'name avatar headline role skills'))));
router.patch('/connections/:id', body('action').isIn(['accept', 'reject']), asyncHandler(async (req, res) => {
  validate(req);
  const connection = await Connection.findOne({ _id: req.params.id, recipient: req.user.id, status: 'pending' });
  if (!connection) throw new ApiError(404, 'Pending request not found.');
  connection.status = req.body.action === 'accept' ? 'accepted' : 'rejected';
  await connection.save();
  if (connection.status === 'accepted') await notify(connection.requester, 'connection_accepted', { connectionId: connection.id, from: req.user.id, name: req.user.name });
  send(res, connection);
}));
router.delete('/connections/:id', asyncHandler(async (req, res) => {
  const result = await Connection.deleteOne({ _id: req.params.id, $or: [{ requester: req.user.id }, { recipient: req.user.id }] });
  if (!result.deletedCount) throw new ApiError(404, 'Connection not found.');
  send(res, null, 'Connection removed.');
}));

router.get('/chat/conversations', asyncHandler(async (req, res) => {
  const records = await Conversation.find({ participants: req.user.id }).populate('participants', 'name avatar headline').populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name' } }).sort({ updatedAt: -1 });
  send(res, records);
}));
router.post('/chat/conversations/:userId', asyncHandler(async (req, res) => {
  const accepted = await Connection.exists({ status: 'accepted', $or: [{ requester: req.user.id, recipient: req.params.userId }, { requester: req.params.userId, recipient: req.user.id }] });
  if (!accepted) throw new ApiError(403, 'You can only message an accepted connection.');
  let conversation = await Conversation.findOne({ participants: { $all: [req.user.id, req.params.userId], $size: 2 } });
  if (!conversation) conversation = await Conversation.create({ participants: [req.user.id, req.params.userId] });
  send(res, await conversation.populate('participants', 'name avatar headline'));
}));
router.get('/chat/conversations/:id/messages', asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 30;
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversation.id }).populate('sender', 'name avatar').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Message.countDocuments({ conversation: conversation.id })
  ]);
  send(res, { messages: messages.reverse(), total, page, pages: Math.ceil(total / limit) });
}));
router.post('/chat/conversations/:id/messages', body('text').trim().notEmpty().isLength({ max: 5000 }), asyncHandler(async (req, res) => {
  validate(req);
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  const message = await Message.create({ conversation: conversation.id, sender: req.user.id, text: req.body.text, readBy: [req.user._id] });
  conversation.lastMessage = message.id; await conversation.save();
  const populated = await message.populate('sender', 'name avatar');
  for (const participant of conversation.participants) if (participant.toString() !== req.user.id) {
    await emitToUser(participant, 'message:new', populated);
    await notify(participant, 'message', { conversationId: conversation.id, from: req.user.id, name: req.user.name, preview: message.text.slice(0, 100) });
  }
  send(res, populated, 'Message sent.', 201);
}));
router.patch('/chat/conversations/:id/read', asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  await Message.updateMany({ conversation: conversation.id, sender: { $ne: req.user.id } }, { $addToSet: { readBy: req.user._id } });
  send(res, null, 'Conversation marked as read.');
}));

router.post('/teams', body('name').trim().notEmpty().isLength({ max: 80 }), asyncHandler(async (req, res) => {
  validate(req);
  const team = await Team.create({ name: req.body.name, description: req.body.description || '', hackathon: req.body.hackathon || undefined, owner: req.user.id, members: [req.user.id], openRoles: req.body.openRoles || [] });
  send(res, team, 'Team created.', 201);
}));
router.get('/teams/mine', asyncHandler(async (req, res) => send(res, await Team.find({ $or: [{ owner: req.user.id }, { members: req.user.id }, { invites: req.user.id }] }).populate('owner members invites', 'name avatar role headline').populate('hackathon', 'title'))));
router.get('/teams/:id', asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id).populate('owner members invites', 'name avatar role headline').populate('hackathon', 'title');
  if (!team) throw new ApiError(404, 'Team not found.');
  send(res, team);
}));
router.put('/teams/:id', asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, owner: req.user.id });
  if (!team) throw new ApiError(404, 'Team not found or you are not the owner.');
  for (const key of ['name', 'description', 'openRoles']) if (req.body[key] !== undefined) team[key] = req.body[key];
  await team.save(); send(res, team);
}));
router.post('/teams/:id/invite/:userId', asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, owner: req.user.id });
  if (!team) throw new ApiError(404, 'Team not found or you are not the owner.');
  const connected = await Connection.exists({ status: 'accepted', $or: [{ requester: req.user.id, recipient: req.params.userId }, { requester: req.params.userId, recipient: req.user.id }] });
  if (!connected) throw new ApiError(403, 'You can only invite a connection.');
  if (!team.invites.some((id) => id.toString() === req.params.userId) && !team.members.some((id) => id.toString() === req.params.userId)) team.invites.push(req.params.userId);
  await team.save(); await notify(req.params.userId, 'team_invite', { teamId: team.id, teamName: team.name, from: req.user.name });
  send(res, team, 'Invitation sent.');
}));
router.post('/teams/:id/accept', asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, invites: req.user.id });
  if (!team) throw new ApiError(404, 'Team invitation not found.');
  team.invites.pull(req.user._id); team.members.addToSet(req.user._id); await team.save();
  send(res, team, 'You joined the team.');
}));
router.post('/teams/:id/leave', asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team || !team.members.some((id) => id.toString() === req.user.id)) throw new ApiError(404, 'Team membership not found.');
  if (team.owner.toString() === req.user.id) throw new ApiError(400, 'The team owner cannot leave. Transfer ownership first.');
  team.members.pull(req.user._id); await team.save(); send(res, team, 'You left the team.');
}));

router.get('/notifications', asyncHandler(async (req, res) => send(res, await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50))));
router.patch('/notifications/read-all', asyncHandler(async (req, res) => { await Notification.updateMany({ user: req.user.id, read: false }, { read: true }); send(res, null, 'Notifications marked as read.'); }));
router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true }, { new: true });
  if (!notification) throw new ApiError(404, 'Notification not found.');
  send(res, notification);
}));

export default router;
