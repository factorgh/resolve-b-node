import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import Institution from '../models/institution.model';
import FinancialProduct from '../models/product.model';
import UserDocument from '../models/document.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';

async function seedUnverifiedData() {
  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is undefined in environment variables.');
    process.exit(1);
  }

  console.log('🍃 Establishing database connection for unverified data seed...');
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('🍃 Connected to MongoDB successfully.');
  } catch (error: any) {
    console.error('❌ MongoDB Connection failed:', error.message);
    process.exit(1);
  }

  try {
    console.log('\n--- 1. Cleaning Existing Unverified Seed Targets ---');
    
    // Clear targeted unverified partners
    const targetPartners = ['Fidelity Microfinance', 'Vanguard Assurance', 'Hisense Ghana'];
    const deletedPartners = await Institution.deleteMany({ name: { $in: targetPartners } });
    console.log(`🧹 Cleaned up ${deletedPartners.deletedCount} old partner institution profiles.`);

    // Clear targeted unverified users
    const targetEmails = [
      'fidelityadmin@resolvebridge.com',
      'vanguardadmin@resolvebridge.com',
      'hisenseadmin@resolvebridge.com',
      'amina@resolvebridge.com',
      'kofi@resolvebridge.com'
    ];
    const existingUsers = await User.find({ email: { $in: targetEmails } });
    const userIds = existingUsers.map(u => u._id);
    
    const deletedUsers = await User.deleteMany({ email: { $in: targetEmails } });
    console.log(`🧹 Cleaned up ${deletedUsers.deletedCount} old user accounts.`);

    // Clear old unverified documents for deleted users
    const deletedDocs = await UserDocument.deleteMany({ userId: { $in: userIds } });
    console.log(`🧹 Cleaned up ${deletedDocs.deletedCount} old compliance documents.`);

    console.log('\n--- 2. Seeding Unverified Multi-Tenant Institutions (B2B Partners) ---');

    // Seed Fidelity Microfinance
    const fidelityMicro = await Institution.create({
      name: 'Fidelity Microfinance',
      legalName: 'Fidelity Microfinance Limited',
      type: 'Bank',
      registrationNumber: 'FML-2011-GH',
      taxId: 'G00020117765',
      email: 'partnerships@fidelitymicro.com.gh',
      phoneNumber: '+233302228833',
      website: 'https://www.fidelitymicro.com.gh',
      logoUrl: 'https://images.unsplash.com/photo-1541354451435-93df9b85c18e?q=80&w=200&auto=format&fit=crop',
      description: 'Fidelity Microfinance delivers targeted micro-lending solutions to micro and small-scale entrepreneurs across Ghana.',
      streetAddress: 'Kojo Thompson Road, Adabraka',
      city: 'Accra',
      state: 'Greater Accra',
      country: 'Ghana',
      isActive: true,
      isVerified: false, // Core constraint: Not Verified!
      creditLimit: 750000,
      currentCreditUsed: 0
    });
    console.log('✅ Seeded Fidelity Microfinance (Status: Underwriting Pending)');

    // Seed Vanguard Assurance
    const vanguardAssur = await Institution.create({
      name: 'Vanguard Assurance',
      legalName: 'Vanguard Assurance Company Limited',
      type: 'Insurance',
      registrationNumber: 'VAC-1974-GH',
      taxId: 'G00019742231',
      email: 'partnerships@vanguardassurance.com',
      phoneNumber: '+233302666441',
      website: 'https://vanguardassurance.com',
      logoUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=200&auto=format&fit=crop',
      description: 'Vanguard Assurance is a premium non-life insurance provider delivering reliable insurance options to African markets.',
      streetAddress: 'Vanguard House, Insurance Plaza',
      city: 'Accra',
      state: 'Greater Accra',
      country: 'Ghana',
      isActive: true,
      isVerified: false, // Core constraint: Not Verified!
      creditLimit: 1200000,
      currentCreditUsed: 0
    });
    console.log('✅ Seeded Vanguard Assurance (Status: Underwriting Pending)');

    // Seed Hisense Ghana
    const hisenseGh = await Institution.create({
      name: 'Hisense Ghana',
      legalName: 'Hisense Ghana Retail Limited',
      type: 'Merchant',
      registrationNumber: 'HGL-2010-GH',
      taxId: 'G00020108842',
      email: 'retailpartnerships@hisense.com.gh',
      phoneNumber: '+233302559988',
      website: 'https://hisense.com.gh',
      logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&auto=format&fit=crop',
      description: 'Hisense Ghana is a global leader in high-performance consumer appliances and devices with wide-ranging retail outlets.',
      streetAddress: 'Spintex Road, Accra',
      city: 'Accra',
      state: 'Greater Accra',
      country: 'Ghana',
      isActive: true,
      isVerified: false, // Core constraint: Not Verified!
      creditLimit: 900000,
      currentCreditUsed: 0
    });
    console.log('✅ Seeded Hisense Ghana (Status: Underwriting Pending)');


    console.log('\n--- 3. Seeding Administrative Accounts (B2B Partner Representatives) ---');
    const testingPassword = 'Password123!';
    const hashed = await bcrypt.hash(testingPassword, 10);

    // 1. Fidelity Admin (Role: InstitutionAdmin)
    const fidelityAdmin = await User.create({
      email: 'fidelityadmin@resolvebridge.com',
      phoneNumber: '+233502288331',
      firstName: 'Ama',
      lastName: 'Fidelity Manager',
      password: hashed,
      market: 'Ghana',
      role: 'InstitutionAdmin',
      kycStatus: 'Pending',
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
      institutionId: fidelityMicro._id
    });
    console.log('✅ Seeded Fidelity Admin account: fidelityadmin@resolvebridge.com');

    // 2. Vanguard Admin (Role: InsuranceAdmin)
    const vanguardAdmin = await User.create({
      email: 'vanguardadmin@resolvebridge.com',
      phoneNumber: '+233246664412',
      firstName: 'Kojo',
      lastName: 'Vanguard Risk Officer',
      password: hashed,
      market: 'Ghana',
      role: 'InsuranceAdmin',
      kycStatus: 'Pending',
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
      institutionId: vanguardAssur._id
    });
    console.log('✅ Seeded Vanguard Admin account: vanguardadmin@resolvebridge.com');

    // 3. Hisense Admin (Role: BNPLAdmin)
    const hisenseAdmin = await User.create({
      email: 'hisenseadmin@resolvebridge.com',
      phoneNumber: '+233205599883',
      firstName: 'Efe',
      lastName: 'Hisense Sales Lead',
      password: hashed,
      market: 'Ghana',
      role: 'BNPLAdmin',
      kycStatus: 'Pending',
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
      institutionId: hisenseGh._id
    });
    console.log('✅ Seeded Hisense Admin account: hisenseadmin@resolvebridge.com');


    console.log('\n--- 4. Seeding Sample Financial Products ---');
    
    // Seed Fidelity Product
    await FinancialProduct.create({
      name: 'Fidelity Agro-Growth Loan',
      description: 'Custom micro-credits tailored to smallholder agricultural producers and supply-chain dealers in rural districts.',
      productType: 'Loan',
      institutionId: fidelityMicro._id,
      minAmount: 1500,
      maxAmount: 80000,
      interestRate: 19.5,
      minTenureMonths: 6,
      maxTenureMonths: 24,
      requirements: 'Ghana Card, active membership in agricultural cooperative or formal crop distribution network.',
      benefits: 'Flexible harvest-aligned grace periods, quick 48-hour cash disbursement, customized repayment structures.',
      termsAndConditions: 'Default repayments will trigger formal debt restructuring or collateral recovery mechanisms.',
      isActive: true,
      isFeatured: false,
      displayOrder: 4
    });
    console.log('✅ Seeded Fidelity agro-finance product');

    // Seed Vanguard Product
    await FinancialProduct.create({
      name: 'Vanguard Family Life Shield',
      description: 'Secure micro-insurance safeguarding family units against sudden life transitions and educational disruptions.',
      productType: 'Insurance',
      institutionId: vanguardAssur._id,
      minAmount: 250,
      maxAmount: 10000,
      interestRate: 3.8,
      minTenureMonths: 6,
      maxTenureMonths: 12,
      requirements: 'Valid National identification card, driver\'s license or passport with two passport photographs.',
      benefits: 'Affordable micro-premiums, automated family checkouts, absolute coverage on primary school tuition fee structures.',
      termsAndConditions: 'Continuous coverage requires active status of consecutive premium payment schedules.',
      isActive: true,
      isFeatured: false,
      displayOrder: 5
    });
    console.log('✅ Seeded Vanguard insurance product');

    // Seed Hisense Product
    await FinancialProduct.create({
      name: 'Hisense Appliance Split-Pay',
      description: 'Zero downpayment financing package on smart TVs, premium refrigerators, and home cooling solutions.',
      productType: 'BNPL',
      institutionId: hisenseGh._id,
      minAmount: 500,
      maxAmount: 25000,
      interestRate: 12,
      minTenureMonths: 3,
      maxTenureMonths: 12,
      requirements: 'Proof of residential address via utility bill, Ghana Card, active mobile money ledger.',
      benefits: 'Bring appliances home instantly, split repayments seamlessly across monthly direct debits.',
      termsAndConditions: 'Appliances are formally leased and remain Hisense legal property until balance settles fully.',
      isActive: true,
      isFeatured: false,
      displayOrder: 6
    });
    console.log('✅ Seeded Hisense BNPL retail product');


    console.log('\n--- 5. Seeding Consumer Profiles (Customers) ---');

    // 1. Amina Osei (Completely Pending KYC)
    await User.create({
      email: 'amina@resolvebridge.com',
      phoneNumber: '+233549887711',
      firstName: 'Amina',
      lastName: 'Osei',
      password: hashed,
      market: 'Ghana',
      role: 'Customer',
      kycStatus: 'Pending', // Completely unverified customer
      isActive: true,
      emailVerified: false,
      phoneVerified: false
    });
    console.log('✅ Seeded Amina Osei (Status: Pending KYC, no documents uploaded)');

    // 2. Kofi Mensah (KYC Submitted, awaiting underwriting approval)
    const kofi = await User.create({
      email: 'kofi@resolvebridge.com',
      phoneNumber: '+233249112233',
      firstName: 'Kofi',
      lastName: 'Mensah',
      password: hashed,
      market: 'Ghana',
      role: 'Customer',
      kycStatus: 'Submitted', // Submitted and ready for SuperAdmin review!
      isActive: true,
      emailVerified: true, // Bypass verification OTPs for seamless manual testing
      phoneVerified: true
    });
    console.log('✅ Seeded Kofi Mensah (Status: KYC Submitted, ready for review)');


    console.log('\n--- 6. Seeding Kofi Mensah Compliance Documents ---');

    // Document 1: Ghana Card / National ID
    const cardDoc = await UserDocument.create({
      userId: kofi._id,
      type: 'NationalId',
      documentUrl: 'https://pub-35bea1efbb5f4c8aa7100b14faba69dd.r2.dev/mock-ghana-card.pdf',
      documentNumber: 'GHA-718293819-2',
      expiryDate: new Date('2032-12-31'),
      isVerified: false, // Core constraint: Not Verified!
      uploadedAt: new Date(Date.now() - 3600 * 1000) // 1 hour ago
    });
    console.log('✅ Seeded Kofi Mensah Document: Ghana Card (NationalId - Unverified)');

    // Document 2: Utility Bill
    const billDoc = await UserDocument.create({
      userId: kofi._id,
      type: 'UtilityBill',
      documentUrl: 'https://pub-35bea1efbb5f4c8aa7100b14faba69dd.r2.dev/mock-utility-bill.pdf',
      documentNumber: 'GWCL-38491829',
      expiryDate: new Date('2026-10-15'),
      isVerified: false, // Core constraint: Not Verified!
      uploadedAt: new Date(Date.now() - 1800 * 1000) // 30 minutes ago
    });
    console.log('✅ Seeded Kofi Mensah Document: Utility Bill (UtilityBill - Unverified)');

    console.log('\n==================================================');
    console.log('🌟 UNVERIFIED SEED INJECTION SUCCESSFULLY COMPLETED!');
    console.log('==================================================');
    console.log('Testing Password for all accounts: ' + testingPassword);
    console.log('\nB2B PARTNERS (Status: Underwriting Pending):');
    console.log('1. Bank/Microfinance: fidelityadmin@resolvebridge.com (Fidelity Microfinance)');
    console.log('2. Insurance Desk:    vanguardadmin@resolvebridge.com   (Vanguard Assurance)');
    console.log('3. Merchant Console:  hisenseadmin@resolvebridge.com    (Hisense Ghana)');
    console.log('\nCONSUMERS (Customers):');
    console.log('1. Amina Osei: amina@resolvebridge.com (Status: Pending - no uploads)');
    console.log('2. Kofi Mensah: kofi@resolvebridge.com   (Status: Submitted - awaits document underwriting)');
    console.log('==================================================\n');

  } catch (error: any) {
    console.error('❌ Error executing seeds:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🍃 Mongoose database connection cleanly disconnected.');
  }
}

seedUnverifiedData();
