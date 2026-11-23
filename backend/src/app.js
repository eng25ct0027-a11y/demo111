import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { emitLocally } from './services/socket.service.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.resolve('uploads')));
app.post('/internal/events', (req, res) => {
  const secret = process.env.SOCKET_BRIDGE_SECRET;
  if (!secret || req.get('authorization') !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  const { userId, event, data } = req.body || {};
  if (!userId || !['message:new', 'notification:new'].includes(event)) {
    return res.status(400).json({ success: false, message: 'Invalid realtime event.' });
  }
  emitLocally(userId, event, data);
  return res.status(202).json({ success: true, message: 'Event delivered.' });
});
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
export default app;
