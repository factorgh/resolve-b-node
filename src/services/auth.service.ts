import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import Institution from '../models/institution.model';
import { storageService } from './storage.service';
import UserDocument from '../models/document.model';
import { getJwtSecret, JWT_EXPIRES_IN } from '../utils/jwtConfig';
import { sanitizeUser } from '../utils/sanitizeUser';
import { resolveRegistrationRole } from '../utils/registerRoles';
import { buildStorageKey } from '../utils/safeFilename';
import { notificationService } from './notification.service';

function buildTokenPayload(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    institutionId: user.institutionId ? user.institutionId.toString() : undefined,
    regionId: user.regionId ? user.regionId.toString() : undefined,
  };
}

function buildAuthResponse(user: InstanceType<typeof User>) {
  const accessToken = jwt.sign(buildTokenPayload(user), getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Whitelist fields allowed during registration */
function pickRegistrationFields(userData: Record<string, any>) {
  const role = resolveRegistrationRole(userData.role);
  const allowed = [
    'email', 'firstName', 'lastName', 'phoneNumber', 'middleName', 'dateOfBirth',
    'market', 'title', 'maritalStatus', 'gender', 'nationality', 'dependants',
    'residentialAddress', 'city', 'mmda', 'landmark', 'employer', 'sector',
    'occupation', 'ssnitNo', 'workAddress', 'yearsWithEmployer', 'goals',
    'employmentStatus', 'monthlyIncome', 'loanDuration', 'idType', 'idNumber',
    'legalName', 'registrationNumber', 'taxId', 'website', 'streetAddress', 'country',
  ];
  const picked: Record<string, any> = { role };
  for (const key of allowed) {
    if (userData[key] !== undefined) picked[key] = userData[key];
  }
  return picked;
}

export const authService = {
  register: async (userData: Record<string, any>) => {
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { phoneNumber: userData.phoneNumber }
      ]
    });

    if (existingUser) {
      return { success: false, message: 'User with this email or phone number already exists' };
    }

    const safeData = pickRegistrationFields(userData);

    if (['BankAdmin', 'BNPLAdmin', 'InsuranceAdmin'].includes(safeData.role)) {
      const instType = safeData.role === 'BankAdmin' ? 'Bank' : safeData.role === 'BNPLAdmin' ? 'Merchant' : 'Insurance';
      const inst = await Institution.create({
        name: safeData.legalName || 'New Institution Partner',
        legalName: safeData.legalName || 'New Institution Partner',
        type: instType,
        registrationNumber: safeData.registrationNumber || 'PENDING',
        taxId: safeData.taxId || 'PENDING',
        email: safeData.email,
        phoneNumber: safeData.phoneNumber,
        website: safeData.website || '',
        streetAddress: safeData.streetAddress || 'PENDING',
        city: safeData.city || 'PENDING',
        state: safeData.city || 'PENDING',
        country: safeData.country || 'Ghana',
        isActive: true,
        isVerified: false
      });
      safeData.institutionId = inst._id;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await User.create({
      ...safeData,
      password: hashedPassword,
      isActive: true,
    });

    if (user.phoneNumber) {
      const welcomeMsg = `Welcome to ResolveBridge, ${user.firstName}! Your financial hub account has been successfully created. Log in at resolvebridge.com to manage and explore your facilities.`;
      notificationService.sendSmsNotification(user.phoneNumber, welcomeMsg).catch(err => {
        console.error('Welcome SMS failed to send:', err);
      });
    }

    return {
      success: true,
      data: buildAuthResponse(user),
    };
  },

  login: async (identifier: string, pass: string) => {
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ]
    }).select('+password');

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Your account has been deactivated. Please contact support.' };
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return { success: false, message: 'Invalid credentials' };
    }

    if (['BankAdmin', 'BNPLAdmin', 'InsuranceAdmin'].includes(user.role) && user.institutionId) {
      const inst = await Institution.findById(user.institutionId);
      if (inst && !inst.isVerified) {
        return { 
          success: false, 
          message: 'Your partner account is pending underwriting review. Resolve super-administrators have been notified and will verify your corporate credentials shortly.' 
        };
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    if (user.phoneNumber) {
      const formattedDate = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
      const loginAlertMsg = `Security Alert: A new login was detected on your ResolveBridge account on ${formattedDate} (UTC). If this was not you, please contact support immediately.`;
      notificationService.sendSmsNotification(user.phoneNumber, loginAlertMsg).catch(err => {
        console.error('Login SMS alert failed:', err);
      });
    }

    return {
      success: true,
      data: buildAuthResponse(user),
    };
  },

  getMe: async (id: string) => {
    return User.findById(id).select('-password');
  },

  verifyKyc: async (userId: string, files: Express.Multer.File[]) => {
    for (const file of files) {
      const fileName = buildStorageKey('kyc', userId, file.originalname);
      const url = await storageService.uploadFile(file.buffer, fileName, file.mimetype);
      
      await UserDocument.create({
        userId,
        type: 'KYC_DOC',
        documentUrl: url,
        isVerified: false,
      });
    }

    await User.findByIdAndUpdate(userId, { kycStatus: 'Submitted' });

    return { success: true, message: 'KYC documents submitted successfully' };
  }
};
