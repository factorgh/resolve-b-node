import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL || '');
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.warn(`⚠️ Warning: Server is running without active database connection! Make sure MongoDB Atlas IP is whitelisted.`);
  }
};

export default connectDB;
