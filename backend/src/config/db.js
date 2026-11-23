import mongoose from 'mongoose';
import { env } from './env.js';

let connectionPromise;
export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) connectionPromise = undefined;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
