import http from 'node:http';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { initializeSocket } from './src/services/socket.service.js';

const server = http.createServer(app);
initializeSocket(server);
try {
  await connectDB();
  server.listen(env.port, () => console.log(`CoFounder AI API listening on http://localhost:${env.port}`));
} catch (error) {
  console.error('Unable to start CoFounder AI:', error);
  process.exitCode = 1;
}
