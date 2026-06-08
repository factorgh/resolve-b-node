import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }
  await mongoose.connect(dbUrl);
  console.log("Connected to DB");

  // Get user and document
  const User = require('../src/models/user.model').default;
  const UserDocument = require('../src/models/document.model').default;

  const docId = "6a1480c061f4e9c7814aaecc"; // mock utility bill id
  const userId = "6a1480c061f4e9c7814aaeca";

  const user = await User.findById(userId);
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  // Generate a mock JWT token for the user
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || '[ENCRYPTION_KEY]',
    { expiresIn: '1h' }
  );

  console.log("Generated Auth Token:", token);

  try {
    const url = `http://localhost:5001/api/v1/Documents/my-documents/${docId}`;
    console.log(`Sending DELETE request to ${url}...`);
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("RESPONSE SUCCESS:", response.data);
  } catch (err: any) {
    if (err.response) {
      console.error("RESPONSE ERROR:", err.response.status, err.response.data);
    } else {
      console.error("REQUEST ERROR:", err.message);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
