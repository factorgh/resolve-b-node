import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import Institution from '../models/institution.model';
import FinancialProduct from '../models/product.model';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';

async function seedDatabase() {
  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is undefined in env variables.');
    process.exit(1);
  }

  console.log('🍃 Initiating database connection...');
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('🍃 MongoDB Connected successfully.');
  } catch (error: any) {
    console.error('❌ MongoDB Connection failed:', error.message);
    process.exit(1);
  }

  try {
    console.log('\n--- Seeding Multi-Tenant Institutions ---');
    
    // 1. Seed GCB Bank (Type: Bank)
    let gcbBank = await Institution.findOne({ name: 'GCB Bank' });
    if (!gcbBank) {
      gcbBank = await Institution.create({
        name: 'GCB Bank',
        legalName: 'GCB Bank PLC',
        type: 'Bank',
        registrationNumber: 'GCB-1953-GH',
        taxId: 'G00019532299',
        email: 'partnerships@gcbbank.com.gh',
        phoneNumber: '+233302664914',
        website: 'https://www.gcbbank.com.gh',
        logoUrl: 'https://www.gcbbank.com.gh/templates/gcb/images/logo.png',
        description: 'GCB Bank PLC is the largest indigenous bank in Ghana in terms of assets.',
        streetAddress: 'High Street, Accra',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        isActive: true,
        isVerified: true,
        creditLimit: 5000000,
        currentCreditUsed: 0
      });
      console.log('✅ Seeded GCB Bank Partner Profile.');
    } else {
      console.log('ℹ️ GCB Bank already exists.');
    }

    // 2. Seed Enterprise Insurance (Type: Insurance)
    let enterpriseIns = await Institution.findOne({ name: 'Enterprise Insurance' });
    if (!enterpriseIns) {
      enterpriseIns = await Institution.create({
        name: 'Enterprise Insurance',
        legalName: 'Enterprise Insurance Company Limited',
        type: 'Insurance',
        registrationNumber: 'EIC-1924-GH',
        taxId: 'G00019249821',
        email: 'info@enterprisegroup.net.gh',
        phoneNumber: '+233302666847',
        website: 'https://myenterprisegroup.io',
        logoUrl: 'https://myenterprisegroup.io/logo.png',
        description: 'Enterprise Insurance is the oldest and leading private insurance provider in Ghana.',
        streetAddress: 'Enterprise House, 11 High Street',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        isActive: true,
        isVerified: true,
        creditLimit: 2000000,
        currentCreditUsed: 0
      });
      console.log('✅ Seeded Enterprise Insurance Partner Profile.');
    } else {
      console.log('ℹ️ Enterprise Insurance already exists.');
    }

    // 3. Seed Electroland Ghana (Type: Merchant / BNPL)
    let electroland = await Institution.findOne({ name: 'Electroland Ghana' });
    if (!electroland) {
      electroland = await Institution.create({
        name: 'Electroland Ghana',
        legalName: 'Electroland Ghana Limited',
        type: 'Merchant',
        registrationNumber: 'EGL-2005-GH',
        taxId: 'G00020058821',
        email: 'customercare@electrolandgh.com',
        phoneNumber: '+233244342299',
        website: 'https://electrolandgh.com',
        logoUrl: 'https://electrolandgh.com/logo.png',
        description: 'Electroland Ghana Limited is the largest distributor of electronics, home appliances, and phones in Ghana.',
        streetAddress: 'Ring Road Central, Accra',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        isActive: true,
        isVerified: true,
        creditLimit: 1500000,
        currentCreditUsed: 0
      });
      console.log('✅ Seeded Electroland Ghana Partner Profile.');
    } else {
      console.log('ℹ️ Electroland Ghana already exists.');
    }


    console.log('\n--- Seeding Administrative Accounts ---');
    const commonPassword = 'Password123!';
    const hashed = await bcrypt.hash(commonPassword, 10);

    // 1. SuperAdmin (Global Director)
    let superAdmin = await User.findOne({ email: 'superadmin@resolvebridge.com' });
    if (!superAdmin) {
      superAdmin = await User.create({
        email: 'superadmin@resolvebridge.com',
        phoneNumber: '+233000000001',
        firstName: 'Resolve',
        lastName: 'Platform Director',
        password: hashed,
        market: 'Ghana',
        role: 'SuperAdmin',
        kycStatus: 'Verified',
        isActive: true,
        emailVerified: true,
        phoneVerified: true
      });
      console.log('✅ Seeded SuperAdmin Account (superadmin@resolvebridge.com).');
    } else {
      console.log('ℹ️ SuperAdmin Account already exists.');
    }

    // 2. InstitutionAdmin (GCB Bank Desk)
    let bankAdmin = await User.findOne({ email: 'bankadmin@resolvebridge.com' });
    if (!bankAdmin) {
      bankAdmin = await User.create({
        email: 'bankadmin@resolvebridge.com',
        phoneNumber: '+233000000002',
        firstName: 'Kwame',
        lastName: 'Lending Officer',
        password: hashed,
        market: 'Ghana',
        role: 'InstitutionAdmin',
        kycStatus: 'Verified',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        institutionId: gcbBank._id
      });
      console.log('✅ Seeded GCB Bank Admin Account (bankadmin@resolvebridge.com).');
    } else {
      console.log('ℹ️ GCB Bank Admin Account already exists.');
    }

    // 3. InsuranceAdmin (Enterprise Insurance Desk)
    let insuranceAdmin = await User.findOne({ email: 'insuranceadmin@resolvebridge.com' });
    if (!insuranceAdmin) {
      insuranceAdmin = await User.create({
        email: 'insuranceadmin@resolvebridge.com',
        phoneNumber: '+233000000003',
        firstName: 'Ekow',
        lastName: 'Risk Manager',
        password: hashed,
        market: 'Ghana',
        role: 'InsuranceAdmin',
        kycStatus: 'Verified',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        institutionId: enterpriseIns._id
      });
      console.log('✅ Seeded Enterprise Insurance Admin Account (insuranceadmin@resolvebridge.com).');
    } else {
      console.log('ℹ️ Enterprise Insurance Admin Account already exists.');
    }

    // 4. BNPLAdmin (Electroland Ghana Desk)
    let bnplAdmin = await User.findOne({ email: 'bnpladmin@resolvebridge.com' });
    if (!bnplAdmin) {
      bnplAdmin = await User.create({
        email: 'bnpladmin@resolvebridge.com',
        phoneNumber: '+233000000004',
        firstName: 'Naa',
        lastName: 'Retail Manager',
        password: hashed,
        market: 'Ghana',
        role: 'BNPLAdmin',
        kycStatus: 'Verified',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        institutionId: electroland._id
      });
      console.log('✅ Seeded Electroland BNPL Admin Account (bnpladmin@resolvebridge.com).');
    } else {
      console.log('ℹ️ Electroland BNPL Admin Account already exists.');
    }


    console.log('\n--- Seeding Sample Financial Products ---');

    // 1. GCB Bank Personal Financing Loan
    let gcbProduct = await FinancialProduct.findOne({ name: 'GCB Bank Personal Finance Loan' });
    if (!gcbProduct) {
      await FinancialProduct.create({
        name: 'GCB Bank Personal Finance Loan',
        description: 'Flexible personal financing tailored for salaried public and private sector employees in Ghana.',
        productType: 'Loan',
        institutionId: gcbBank._id,
        minAmount: 1000,
        maxAmount: 250000,
        interestRate: 24,
        minTenureMonths: 6,
        maxTenureMonths: 48,
        requirements: 'GH Card, 3 Months Payslip, Active bank statement from a registered financial institution.',
        benefits: 'No collateral required, fast underwriting cycle under 24 hours, flexible repayment schedules.',
        termsAndConditions: 'Default repayments will be auto-debited. Interest calculations are resolved p.a.',
        isActive: true,
        isFeatured: true,
        displayOrder: 1
      });
      console.log('✅ Seeded GCB Bank Personal Finance Loan.');
    } else {
      console.log('ℹ️ GCB Loan Product already exists.');
    }

    // 2. Enterprise Auto Shield
    let enterpriseProduct = await FinancialProduct.findOne({ name: 'Enterprise Auto Shield Premium' });
    if (!enterpriseProduct) {
      await FinancialProduct.create({
        name: 'Enterprise Auto Shield Premium',
        description: 'Comprehensive motor insurance financing package providing absolute protection on private vehicles.',
        productType: 'Insurance',
        institutionId: enterpriseIns._id,
        minAmount: 500,
        maxAmount: 15000,
        interestRate: 4.5,
        minTenureMonths: 3,
        maxTenureMonths: 12,
        requirements: 'Driver\'s License, Vehicle registration documents (DVLA logs), Passport picture.',
        benefits: 'Flexible monthly premium payments instead of yearly bulk, third party liabilities covered, automated claim checks.',
        termsAndConditions: 'Policy becomes immediately void upon failure to complete consecutive monthly premium disbursements.',
        isActive: true,
        isFeatured: true,
        displayOrder: 2
      });
      console.log('✅ Seeded Enterprise Auto Shield.');
    } else {
      console.log('ℹ️ Enterprise Insurance Product already exists.');
    }

    // 3. Electroland BNPL Appliance Financing
    let electrolandProduct = await FinancialProduct.findOne({ name: 'Electroland BNPL Tech Tier' });
    if (!electrolandProduct) {
      await FinancialProduct.create({
        name: 'Electroland BNPL Tech Tier',
        description: 'Buy smartphones, laptops, and smart home appliances now and split payments across comfortable installments.',
        productType: 'BNPL',
        institutionId: electroland._id,
        minAmount: 200,
        maxAmount: 40000,
        interestRate: 15,
        minTenureMonths: 3,
        maxTenureMonths: 18,
        requirements: 'Ghana Card, proof of active mobile money wallet or salary bank account.',
        benefits: 'Take home items instantly, no downpayment for verified employers, split repayments weekly or monthly.',
        termsAndConditions: 'Title of the asset remains with Electroland until full ledger settlements are executed.',
        isActive: true,
        isFeatured: true,
        displayOrder: 3
      });
      console.log('✅ Seeded Electroland BNPL Tech Tier.');
    } else {
      console.log('ℹ️ Electroland BNPL Product already exists.');
    }

    console.log('\n🌟 Seeding Operation Completed Successfully!');
    console.log('--------------------------------------------------');
    console.log('Standard Credentials seeded to database:');
    console.log('Password for all users: ' + commonPassword);
    console.log('1. SuperAdmin: superadmin@resolvebridge.com');
    console.log('2. BankAdmin: bankadmin@resolvebridge.com');
    console.log('3. InsuranceAdmin: insuranceadmin@resolvebridge.com');
    console.log('4. BNPLAdmin: bnpladmin@resolvebridge.com');
    console.log('--------------------------------------------------');

  } catch (error: any) {
    console.error('❌ Error executing seeds:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🍃 Mongoose connection closed.');
  }
}

seedDatabase();
