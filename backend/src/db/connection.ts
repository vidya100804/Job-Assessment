import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobflow';

export async function connectDB(): Promise<void> {
  try {
    console.log(`[Database] Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] MongoDB connected successfully');
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
}
