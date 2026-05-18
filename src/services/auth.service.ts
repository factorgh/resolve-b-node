import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Institution from '../models/institution.model';
import { storageService } from './storage.service';
import UserDocument from '../models/document.model';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const authService = {
  register: async (userData: any) => {
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { phoneNumber: userData.phoneNumber }
      ]
    });

    if (existingUser) {
      return { success: false, message: 'User with this email or phone number already exists' };
    }

    // Check if registering a partner role and create Institution first
    if (['BankAdmin', 'BNPLAdmin', 'InsuranceAdmin'].includes(userData.role)) {
      const instType = userData.role === 'BankAdmin' ? 'Bank' : userData.role === 'BNPLAdmin' ? 'Merchant' : 'Insurance';
      const inst = await Institution.create({
        name: userData.legalName || 'New Institution Partner',
        legalName: userData.legalName || 'New Institution Partner',
        type: instType,
        registrationNumber: userData.registrationNumber || 'PENDING',
        taxId: userData.taxId || 'PENDING',
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        website: userData.website || '',
        streetAddress: userData.streetAddress || 'PENDING',
        city: userData.city || 'PENDING',
        state: userData.city || 'PENDING',
        country: userData.country || 'Ghana',
        isActive: true,
        isVerified: false
      });
      userData.institutionId = inst._id;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    console.log('Registering user with data:', JSON.stringify(userData, null, 2));

    const user = await User.create({
      ...userData,
      password: hashedPassword,
      isActive: true,
    });

    const accessToken = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email,
        role: user.role,
        institutionId: user.institutionId ? user.institutionId.toString() : undefined
      }, 
      JWT_SECRET, 
      {
        expiresIn: JWT_EXPIRES_IN as any,
      }
    );

    return {
      success: true,
      data: {
        user,
        accessToken,
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  },

  login: async (identifier: string, pass: string) => {
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ]
    });

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Enforce partner account verification check
    if (['BankAdmin', 'BNPLAdmin', 'InsuranceAdmin'].includes(user.role) && user.institutionId) {
      const inst = await Institution.findById(user.institutionId);
      if (inst && !inst.isVerified) {
        return { 
          success: false, 
          message: 'Your partner account is pending underwriting review. Resolve super-administrators have been notified and will verify your corporate credentials shortly.' 
        };
      }
    }

    const accessToken = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email,
        role: user.role,
        institutionId: user.institutionId ? user.institutionId.toString() : undefined
      }, 
      JWT_SECRET, 
      {
        expiresIn: JWT_EXPIRES_IN as any,
      }
    );

    return {
      success: true,
      data: {
        user,
        accessToken,
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  },

  getMe: async (id: string) => {
    return User.findById(id);
  },

  verifyKyc: async (userId: string, files: any[]) => {
    const documentUrls: string[] = [];

    for (const file of files) {
      const fileName = `kyc/${userId}/${Date.now()}-${file.originalname}`;
      const url = await storageService.uploadFile(file.buffer, fileName, file.mimetype);
      
      await UserDocument.create({
        userId,
        type: 'KYC_DOC',
        documentUrl: url,
        isVerified: false,
      });

      documentUrls.push(url);
    }

    await User.findByIdAndUpdate(userId, { kycStatus: 'Submitted' });

    return { success: true, message: 'KYC documents submitted successfully' };
  }
};
