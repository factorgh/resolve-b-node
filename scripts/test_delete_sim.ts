import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import UserDocument from '../src/models/document.model';
import User from '../src/models/user.model';

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }
  await mongoose.connect(dbUrl);
  console.log("Connected to DB");

  const docId = "6a1480c061f4e9c7814aaecb"; // mock ghana card id
  const userId = "6a1480c061f4e9c7814aaeca";

  const doc = await UserDocument.findOne({ _id: docId, userId });
  console.log("Found document:", doc);

  if (doc) {
    if (doc.documentUrl) {
      try {
        const urlObj = new URL(doc.documentUrl);
        const key = decodeURIComponent(urlObj.pathname.substring(1));
        console.log("Parsed key:", key);
        if (key && key.startsWith('vault/')) {
          console.log(`Deleting file from R2: ${key}`);
        } else {
          console.log("Skipping R2 deletion (not starts with vault/)");
        }
      } catch (err: any) {
        console.error("URL parse error:", err.message);
      }
    }

    // Simulate user lookup & save
    const user = await User.findById(userId);
    console.log("Found user:", user?.email);
    if (user) {
      console.log("Original kycStatus:", user.kycStatus);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
