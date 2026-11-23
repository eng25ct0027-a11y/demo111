import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';

let io;
const onlineUsers = new Map();

export function initializeSocket(server) {
  io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.id).select('_id');
      if (!user) return next(new Error('User not found'));
      socket.userId = user.id;
      next();
    } catch (error) { next(error); }
  });
  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(userId);
    onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
    socket.broadcast.emit('user:online', { userId });
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('typing', { userId, conversationId, isTyping: Boolean(isTyping) });
    });
    socket.on('conversation:join', async ({ conversationId }) => {
      const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).select('_id');
      if (conversation) socket.join(conversationId);
    });
    socket.on('message:send', async ({ conversationId, text }, acknowledge = () => {}) => {
      try {
        const content = typeof text === 'string' ? text.trim() : '';
        if (!content || content.length > 5000) return acknowledge({ error: 'Message must be between 1 and 5000 characters.' });
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return acknowledge({ error: 'Conversation not found.' });
        const message = await Message.create({ conversation: conversationId, sender: userId, text: content, readBy: [userId] });
        conversation.lastMessage = message._id;
        await conversation.save();
        const populated = await message.populate('sender', 'name avatar');
        for (const participant of conversation.participants) {
          io.to(participant.toString()).emit('message:new', populated);
          if (participant.toString() !== userId) {
            const notification = await Notification.create({
              user: participant, type: 'message',
              data: { conversationId: conversation.id, from: userId, preview: content.slice(0, 100) }
            });
            io.to(participant.toString()).emit('notification:new', notification);
          }
        }
        io.to(conversationId).emit('typing', { userId, conversationId, isTyping: false });
        acknowledge({ data: populated });
      } catch (error) { acknowledge({ error: error.message }); }
    });
    socket.on('disconnect', () => {
      const count = (onlineUsers.get(userId) || 1) - 1;
      if (count) onlineUsers.set(userId, count);
      else {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user:offline', { userId });
      }
    });
  });
  return io;
}

export const getIO = () => io;
export const isOnline = (userId) => onlineUsers.has(userId.toString());
export async function emitToUser(userId, event, data) {
  if (io) {
    io.to(userId.toString()).emit(event, data);
    return;
  }
  if (!process.env.SOCKET_BRIDGE_URL || !process.env.SOCKET_BRIDGE_SECRET) {
    throw new Error('Realtime bridge is not configured for this API instance.');
  }
  const response = await fetch(`${process.env.SOCKET_BRIDGE_URL.replace(/\/$/, '')}/internal/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SOCKET_BRIDGE_SECRET}` },
    body: JSON.stringify({ userId: userId.toString(), event, data }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`Realtime bridge returned HTTP ${response.status}.`);
}

export function emitLocally(userId, event, data) {
  if (!io) throw new Error('Socket server is not initialized.');
  io.to(userId.toString()).emit(event, data);
}
