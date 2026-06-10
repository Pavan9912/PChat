import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';

let mongod: MongoMemoryServer | null = null;

const seedAdmin = async () => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const defaultAdmin = new User({
      name: 'PChat Administrator',
      username: 'admin',
      email: 'admin@pchat.com',
      password: 'adminpassword', // Will be hashed by pre-save hook
      role: 'admin',
      isVerified: true,
      bio: 'Official PChat Administrator Account.',
    });
    await defaultAdmin.save();
    console.log('--- DEFAULT ADMIN ACCOUNT CREATED ---');
    console.log('Email: admin@pchat.com');
    console.log('Password: adminpassword');
    console.log('------------------------------------');
  }
};

export const connectDB = async () => {
  const connString = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pchat';
  try {
    console.log(`Connecting to MongoDB at: ${connString}`);
    const conn = await mongoose.connect(connString, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Reset all users to offline on startup
    await User.updateMany({}, { isOnline: false });
    console.log('Reset all users online status to offline');
    
    await seedAdmin();
  } catch (error: any) {
    console.warn(`Local MongoDB connection failed: ${error.message}. Starting MongoMemoryServer fallback...`);
    try {
      mongod = await MongoMemoryServer.create({
        binary: {
          version: '7.0.5'
        }
      });
      const memoryUri = mongod.getUri();
      console.log(`Starting in-memory MongoDB server at: ${memoryUri}`);
      const conn = await mongoose.connect(memoryUri);
      console.log(`In-memory MongoDB Connected: ${conn.connection.host}`);
      
      // Reset all users to offline on startup
      await User.updateMany({}, { isOnline: false });
      console.log('Reset all users online status to offline');
      
      await seedAdmin();
    } catch (innerError: any) {
      console.error(`In-memory MongoDB startup failed: ${innerError.message}`);
      process.exit(1);
    }
  }
};
