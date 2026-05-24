import mongoose from 'mongoose';
import Region from '../models/region.model';

const seedRegions = async () => {
  try {
    const count = await Region.countDocuments();
    if (count === 0) {
      const defaultRegions = [
        { name: 'Greater Accra', code: 'ACC', isActive: true },
        { name: 'Ashanti Region', code: 'ASH', isActive: true },
        { name: 'Northern Region', code: 'NOR', isActive: true },
        { name: 'Western Region', code: 'WES', isActive: true },
        { name: 'Central Region', code: 'CEN', isActive: true },
      ];
      await Region.insertMany(defaultRegions);
      console.log('🌍 Default Ghanaian regions seeded successfully!');
    }
  } catch (err: any) {
    console.error('❌ Failed to seed regions:', err.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL || '');
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    await seedRegions();
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.warn(`⚠️ Warning: Server is running without active database connection! Make sure MongoDB Atlas IP is whitelisted.`);
  }
};

export default connectDB;
