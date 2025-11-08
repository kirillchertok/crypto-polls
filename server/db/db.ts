import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.DB_URL || 'mongodb+srv://kirilka2005228:123kirill123@chertokkirillcluster.m2xof.mongodb.net/?retryWrites=true&w=majority&appName=ChertokKirillCluster';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};