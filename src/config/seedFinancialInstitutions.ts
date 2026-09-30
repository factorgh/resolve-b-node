import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import Institution from '../models/institution.model';
import FinancialProduct from '../models/product.model';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL || '';

interface InstitutionSeedData {
  name: string;
  legalName: string;
  type: string;
  registrationNumber: string;
  taxId: string;
  email: string;
  phoneNumber: string;
  website: string;
  logoUrl: string;
  description: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  creditLimit: number;
  subscriptionFee: number;
  connectionFee: number;
  adminEmail: string;
  adminPhone: string;
  adminFirstName: string;
  adminLastName: string;
  products: {
    name: string;
    description: string;
    productType: string;
    minAmount: number;
    maxAmount: number;
    interestRate: number;
    minTenureMonths: number;
    maxTenureMonths: number;
    requirements: string;
    benefits: string;
    termsAndConditions: string;
    isFeatured: boolean;
    displayOrder: number;
    imageUrl?: string;
  }[];
}

const institutionsToSeed: InstitutionSeedData[] = [
  // 1. GCB BANK
  {
    name: 'GCB Bank',
    legalName: 'GCB Bank PLC',
    type: 'Bank',
    registrationNumber: 'GCB-1953-GH',
    taxId: 'G00019532299',
    email: 'partnerships@gcbbank.com.gh',
    phoneNumber: '+233302664914',
    website: 'https://www.gcbbank.com.gh',
    logoUrl: 'https://www.gcbbank.com.gh/templates/gcb/images/logo.png',
    description: 'GCB Bank PLC is Ghana’s largest indigenous financial institution with the widest national branch and digital footprint.',
    streetAddress: 'High Street, Thorpe Road',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-012-3456',
    creditLimit: 10000000,
    subscriptionFee: 1500,
    connectionFee: 50,
    adminEmail: 'gcbadmin@resolvebridge.com',
    adminPhone: '+233241000001',
    adminFirstName: 'Kwame',
    adminLastName: 'Mensah',
    products: [
      {
        name: 'GCB Smart Personal Salary Advance',
        description: 'Instant unsecured salary advance and personal loan facility for salaried employees with competitive interest rates.',
        productType: 'Loan',
        minAmount: 1000,
        maxAmount: 150000,
        interestRate: 21.5,
        minTenureMonths: 6,
        maxTenureMonths: 60,
        requirements: 'Valid Ghana Card, 3 Months Payslips, 6 Months Bank Statement, Proof of Employment.',
        benefits: 'Rapid 15-minute digital disbursement, competitive interest rate, no collateral required for government & corporate workers.',
        termsAndConditions: 'Direct salary assignment or Mobile Money debit mandate required. 1.5% processing fee.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/images/gcb_logo.png'
      },
      {
        name: 'GCB SME Working Capital Booster',
        description: 'Flexible short-to-medium term business loan designed to fund inventory procurement, supplier payments, and working capital needs.',
        productType: 'Loan',
        minAmount: 20000,
        maxAmount: 1000000,
        interestRate: 23.0,
        minTenureMonths: 12,
        maxTenureMonths: 48,
        requirements: 'Business Registration Certificate, 12 Months Audited Financials, Tax Clearance Certificate, Business Plan.',
        benefits: 'Structured repayment aligned with business cash flow cycles, revolving credit option available.',
        termsAndConditions: 'Lien on financed inventory/receivables. Monthly monitoring of account turnover.',
        isFeatured: true,
        displayOrder: 2,
        imageUrl: '/images/gcb_logo.png'
      },
      {
        name: 'GCB Auto Fleet Financing',
        description: 'Tailored vehicle and commercial fleet acquisition finance for corporate logistics and individual transport operators.',
        productType: 'Loan',
        minAmount: 50000,
        maxAmount: 750000,
        interestRate: 19.8,
        minTenureMonths: 12,
        maxTenureMonths: 60,
        requirements: 'Proforma Invoice from certified auto dealer, 30% Equity Contribution, Comprehensive Insurance cover.',
        benefits: 'Up to 70% asset financing with bundled comprehensive insurance from partner underwriters.',
        termsAndConditions: 'Joint registration of vehicle with bank as first lien holder until full loan amortisation.',
        isFeatured: false,
        displayOrder: 3,
        imageUrl: '/images/gcb_logo.png'
      }
    ]
  },

  // 2. FIDELITY BANK
  {
    name: 'Fidelity Bank',
    legalName: 'Fidelity Bank Ghana Limited',
    type: 'Bank',
    registrationNumber: 'FBG-2006-GH',
    taxId: 'G00020064411',
    email: 'corporate.partnerships@myfidelitybank.net',
    phoneNumber: '+233302214490',
    website: 'https://www.fidelitybank.com.gh',
    logoUrl: '/fidelity_logo.png',
    description: 'Fidelity Bank Ghana is a tier-1 private commercial bank pioneering digital consumer lending, SME trade finance, and inclusive banking.',
    streetAddress: 'Ridge Towers, 10 Ambassadorial Enclave',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-088-9900',
    creditLimit: 8500000,
    subscriptionFee: 1200,
    connectionFee: 45,
    adminEmail: 'fidelityadmin@resolvebridge.com',
    adminPhone: '+233241000002',
    adminFirstName: 'Abena',
    adminLastName: 'Osei',
    products: [
      {
        name: 'Fidelity Instant Consumer Credit Line',
        description: 'Dynamic revolving credit line accessible on-demand via Mobile Money or debit card for everyday expenses.',
        productType: 'Loan',
        minAmount: 500,
        maxAmount: 80000,
        interestRate: 22.0,
        minTenureMonths: 3,
        maxTenureMonths: 36,
        requirements: 'Ghana Card, Verified Mobile Money wallet active for over 6 months, Proof of income.',
        benefits: 'Pay interest only on funds drawn. Instant automated top-ups upon on-time repayments.',
        termsAndConditions: 'Automated weekly or monthly direct debit mandate on primary MoMo wallet.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/fidelity_logo.png'
      },
      {
        name: 'Fidelity SME Commercial Trade Facility',
        description: 'Comprehensive import/export trade credit, supplier invoice discounting, and local purchase order (LPO) financing.',
        productType: 'Loan',
        minAmount: 30000,
        maxAmount: 1500000,
        interestRate: 22.5,
        minTenureMonths: 6,
        maxTenureMonths: 36,
        requirements: 'Valid LPO / Contract from verifiable principal, 6 Months Company Bank Statements, Certificate of Incorporation.',
        benefits: 'Up to 80% LPO financing with direct supplier payment to speed up project execution.',
        termsAndConditions: 'Irrevocable letter of assignment of contract proceeds directly into Fidelity Bank collection account.',
        isFeatured: true,
        displayOrder: 2,
        imageUrl: '/fidelity_logo.png'
      }
    ]
  },

  // 3. STANBIC BANK
  {
    name: 'Stanbic Bank',
    legalName: 'Stanbic Bank Ghana Limited',
    type: 'Bank',
    registrationNumber: 'SBG-1999-GH',
    taxId: 'G00019998822',
    email: 'commercial.solutions@stanbic.com.gh',
    phoneNumber: '+233302687670',
    website: 'https://www.stanbicbank.com.gh',
    logoUrl: '/stanbic_logo.png',
    description: 'A member of Standard Bank Group, Stanbic Bank Ghana provides institutional-grade corporate banking, vehicle asset finance, and mortgages.',
    streetAddress: 'Stanbic Heights, 215 South Liberation Link, Airport City',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-112-4040',
    creditLimit: 12000000,
    subscriptionFee: 2000,
    connectionFee: 60,
    adminEmail: 'stanbicadmin@resolvebridge.com',
    adminPhone: '+233241000003',
    adminFirstName: 'Kofi',
    adminLastName: 'Antwi',
    products: [
      {
        name: 'Stanbic Vehicle Asset Finance (VAF)',
        description: 'Ghana’s leading auto financing program for brand new and certified pre-owned vehicles with streamlined dealer partner integrations.',
        productType: 'Loan',
        minAmount: 40000,
        maxAmount: 1200000,
        interestRate: 18.5,
        minTenureMonths: 12,
        maxTenureMonths: 72,
        requirements: 'Proforma invoice from approved dealership, Proof of steady income, Valid Ghana Card, 20% down payment.',
        benefits: 'Lowest market interest rates, comprehensive motor insurance co-issuance, fast 48-hour vehicle drive-away.',
        termsAndConditions: 'Vehicle serves as primary collateral. Tracker installation required for asset security.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/stanbic_logo.png'
      },
      {
        name: 'Stanbic Executive Home & Equity Loan',
        description: 'Long-term residential mortgage and property equity release facility for residential home acquisitions.',
        productType: 'Loan',
        minAmount: 100000,
        maxAmount: 3000000,
        interestRate: 17.5,
        minTenureMonths: 60,
        maxTenureMonths: 240,
        requirements: 'Title Deeds / Land Registry documentation, Property Valuation Report, Proof of stable corporate income.',
        benefits: 'Extended repayment tenure up to 20 years, highly competitive fixed and floating rate options.',
        termsAndConditions: 'First legal mortgage over the acquired property, comprehensive property insurance cover.',
        isFeatured: true,
        displayOrder: 2,
        imageUrl: '/stanbic_logo.png'
      }
    ]
  },

  // 4. CALBANK
  {
    name: 'CalBank',
    legalName: 'CalBank PLC',
    type: 'Bank',
    registrationNumber: 'CAL-1990-GH',
    taxId: 'G00019905544',
    email: 'business@calbank.net',
    phoneNumber: '+233302680068',
    website: 'https://www.calbank.net',
    logoUrl: 'https://www.calbank.net/wp-content/themes/calbank/assets/images/logo.png',
    description: 'CalBank PLC is a dynamic commercial bank in Ghana offering innovative retail, green energy, tech-driven digital lending, and SME banking.',
    streetAddress: '23 Independence Avenue',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-030-2211',
    creditLimit: 7500000,
    subscriptionFee: 1000,
    connectionFee: 40,
    adminEmail: 'calbankadmin@resolvebridge.com',
    adminPhone: '+233241000004',
    adminFirstName: 'Esi',
    adminLastName: 'Appiah',
    products: [
      {
        name: 'CalBank Quick Green & Tech Credit',
        description: 'Specialized financing for renewable solar energy installations, hardware technology upgrades, and digital retail businesses.',
        productType: 'Loan',
        minAmount: 5000,
        maxAmount: 250000,
        interestRate: 20.0,
        minTenureMonths: 6,
        maxTenureMonths: 48,
        requirements: 'Ghana Card, Vendor quotation for solar/tech equipment, 6 months bank or MoMo merchant statement.',
        benefits: 'Discounted concessionary interest rate for eco-friendly green investments, rapid digital approval.',
        termsAndConditions: 'Direct disbursement to certified equipment vendors and installers.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/images/calbank_logo.png'
      },
      {
        name: 'CalBank SME Rapid Trader Facility',
        description: 'Fast-track short term inventory and working capital loan for registered retail merchants and FMCG distributors.',
        productType: 'Loan',
        minAmount: 10000,
        maxAmount: 400000,
        interestRate: 22.8,
        minTenureMonths: 3,
        maxTenureMonths: 24,
        requirements: 'Business Registration certificate, Shop/Warehouse lease agreement, MoMo merchant sales turnover logs.',
        benefits: 'Minimal documentation, flexible daily/weekly micro-repayments via MoMo sweep.',
        termsAndConditions: 'Automated merchant collection sweep into dedicated CalBank escrow.',
        isFeatured: false,
        displayOrder: 2,
        imageUrl: '/images/calbank_logo.png'
      }
    ]
  },

  // 5. NATIONAL INVESTMENT BANK (NIB)
  {
    name: 'National Investment Bank',
    legalName: 'National Investment Bank Limited (NIB)',
    type: 'Bank',
    registrationNumber: 'NIB-1963-GH',
    taxId: 'G00019631100',
    email: 'commercial.credit@nib-ghana.com',
    phoneNumber: '+233302661701',
    website: 'https://www.nib-ghana.com',
    logoUrl: 'https://www.nib-ghana.com/images/nib-logo.png',
    description: 'National Investment Bank (NIB) is Ghana’s premier development and commercial bank specializing in industrial development, manufacturing, and public sector lending.',
    streetAddress: '37 Kwame Nkrumah Avenue',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-044-8822',
    creditLimit: 6000000,
    subscriptionFee: 1000,
    connectionFee: 40,
    adminEmail: 'nibadmin@resolvebridge.com',
    adminPhone: '+233241000005',
    adminFirstName: 'Yaw',
    adminLastName: 'Boateng',
    products: [
      {
        name: 'NIB Industrial Equipment & Agro-Processing Loan',
        description: 'Medium-to-long term capital loan structured for manufacturing machinery, agro-processing equipment, and factory expansion.',
        productType: 'Loan',
        minAmount: 50000,
        maxAmount: 2000000,
        interestRate: 19.5,
        minTenureMonths: 12,
        maxTenureMonths: 84,
        requirements: 'Feasibility study / business plan, Equipment supplier invoice, Land/Factory ownership documents.',
        benefits: 'Grace period (moratorium) on principal repayment up to 6 months during machinery installation.',
        termsAndConditions: 'Debenture over financed manufacturing equipment and fixed corporate assets.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/images/nib_logo.png'
      },
      {
        name: 'NIB Public Sector Controller Payroll Loan',
        description: 'Guaranteed salary deduction credit facility for civil servants, health workers, teachers, and security service personnel.',
        productType: 'Loan',
        minAmount: 1500,
        maxAmount: 100000,
        interestRate: 21.0,
        minTenureMonths: 6,
        maxTenureMonths: 60,
        requirements: 'Staff ID, Controller and Accountant-General’s Department (CAGD) mandate, Ghana Card.',
        benefits: 'Guaranteed lowest payroll rate, zero out-of-pocket processing fees, same-day approval.',
        termsAndConditions: 'Direct third-party CAGD payroll deduction code mandate.',
        isFeatured: true,
        displayOrder: 2,
        imageUrl: '/images/nib_logo.png'
      }
    ]
  },

  // 6. ABSA BANK GHANA
  {
    name: 'Absa Bank Ghana',
    legalName: 'Absa Bank Ghana Limited',
    type: 'Bank',
    registrationNumber: 'ABSA-1917-GH',
    taxId: 'G00019176633',
    email: 'clientexperience@absa.africa',
    phoneNumber: '+233302242340',
    website: 'https://www.absa.com.gh',
    logoUrl: '/absa_logo.png',
    description: 'Absa Bank Ghana Limited provides full-service corporate, investment, and retail digital banking across Ghana.',
    streetAddress: 'Absa House, High Street',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-015-8833',
    creditLimit: 11000000,
    subscriptionFee: 1800,
    connectionFee: 55,
    adminEmail: 'absaadmin@resolvebridge.com',
    adminPhone: '+233241000006',
    adminFirstName: 'Nana',
    adminLastName: 'Agyemang',
    products: [
      {
        name: 'Absa DriveNow Auto Loan',
        description: 'Effortless vehicle financing for private and commercial vehicles with competitive tiered interest rates.',
        productType: 'Loan',
        minAmount: 35000,
        maxAmount: 950000,
        interestRate: 19.0,
        minTenureMonths: 12,
        maxTenureMonths: 60,
        requirements: 'Proforma Invoice, 3 Months Payslip / 6 Months Bank Statement, Proof of Address.',
        benefits: 'Co-branded insurance discount, 24-hour credit sanction, flexible balloon payment option.',
        termsAndConditions: 'Direct salary assignment or debit order mandate.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/absa_logo.png'
      },
      {
        name: 'Absa Business Ignition SME Loan',
        description: 'Uncollateralized credit up to GH₵ 200,000 for verified SMEs with audited sales records.',
        productType: 'Loan',
        minAmount: 15000,
        maxAmount: 500000,
        interestRate: 21.8,
        minTenureMonths: 6,
        maxTenureMonths: 36,
        requirements: 'Business Registration, 12-month bank transaction summary, Tax Clearance certificate.',
        benefits: 'No physical property collateral required up to GH₵ 200,000 threshold.',
        termsAndConditions: 'Corporate and Director joint personal guarantee.',
        isFeatured: false,
        displayOrder: 2,
        imageUrl: '/absa_logo.png'
      }
    ]
  },

  // 7. ECOBANK GHANA
  {
    name: 'Ecobank Ghana',
    legalName: 'Ecobank Ghana PLC',
    type: 'Bank',
    registrationNumber: 'ECO-1990-GH',
    taxId: 'G00019907722',
    email: 'ecobankenquiries@ecobank.com',
    phoneNumber: '+233302610400',
    website: 'https://www.ecobank.com/gh',
    logoUrl: 'https://www.ecobank.com/upload/201901231010377038k9x2qF521O.png',
    description: 'Ecobank Ghana PLC is a leading pan-African banking institution providing frictionless cross-border payments and consumer digital loans.',
    streetAddress: '19 Seventh Avenue, Ridge West',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-028-1199',
    creditLimit: 14000000,
    subscriptionFee: 2000,
    connectionFee: 60,
    adminEmail: 'ecobankadmin@resolvebridge.com',
    adminPhone: '+233241000007',
    adminFirstName: 'Selorm',
    adminLastName: 'Danquah',
    products: [
      {
        name: 'Ecobank Advantage Personal Salary Loan',
        description: 'High-limit unsecured salary loan with tenure up to 5 years and comprehensive credit life insurance protection.',
        productType: 'Loan',
        minAmount: 2000,
        maxAmount: 200000,
        interestRate: 20.5,
        minTenureMonths: 6,
        maxTenureMonths: 60,
        requirements: 'Ghana Card, 3 Months Payslip, 6 Months bank statement, Employer Undertaking.',
        benefits: 'Highest single borrower limit for retail salaried personnel, built-in credit life insurance.',
        termsAndConditions: 'Automatic salary credit or direct deduction mandate.',
        isFeatured: true,
        displayOrder: 1,
        imageUrl: '/images/ecobank_logo.png'
      },
      {
        name: 'Ecobank Ellevate Women Business Facility',
        description: 'Preferential rate financing dedicated to female-owned, female-managed, and women-led enterprises in Ghana.',
        productType: 'Loan',
        minAmount: 10000,
        maxAmount: 750000,
        interestRate: 18.0,
        minTenureMonths: 6,
        maxTenureMonths: 48,
        requirements: 'Business Registration (>51% female ownership or senior executive leadership), 6 months cash flow logs.',
        benefits: 'Exclusive 2.5% discount off standard lending rates, complimentary business coaching.',
        termsAndConditions: 'Standard business covenants and quarterly performance tracking.',
        isFeatured: true,
        displayOrder: 2,
        imageUrl: '/images/ecobank_logo.png'
      }
    ]
  },

  // 8. CONSOLIDATED BANK GHANA (CBG)
  {
    name: 'Consolidated Bank Ghana',
    legalName: 'Consolidated Bank Ghana Limited (CBG)',
    type: 'Bank',
    registrationNumber: 'CBG-2018-GH',
    taxId: 'G00020183344',
    email: 'info@cbg.com.gh',
    phoneNumber: '+233302110088',
    website: 'https://cbg.com.gh',
    logoUrl: 'https://cbg.com.gh/assets/images/logo.png',
    description: 'Consolidated Bank Ghana (CBG) is an indigenous state-backed commercial bank with a mission to champion SME transformation and inclusive retail banking.',
    streetAddress: '1st Floor, Manet Tower 3, Airport City',
    city: 'Accra',
    state: 'Greater Accra',
    country: 'Ghana',
    postalCode: 'GA-115-7722',
    creditLimit: 9000000,
    subscriptionFee: 1200,
    connectionFee: 45,
    adminEmail: 'cbgadmin@resolvebridge.com',
    adminPhone: '+233241000008',
    adminFirstName: 'Kojo',
    adminLastName: 'Sarpong',
    products: [
      {
        name: 'CBG SME Smart Credit Booster',
        description: 'Speedy working capital loan for registered micro, small, and medium businesses in commercial hubs.',
        productType: 'Loan',
        minAmount: 5000,
        maxAmount: 350000,
        interestRate: 22.0,
        minTenureMonths: 3,
        maxTenureMonths: 36,
        requirements: 'Business Registration certificate, 6 Months bank/MoMo statements, Tax identification.',
        benefits: 'Fast 48-hour disbursement, tailored cash-flow repayment plans.',
        termsAndConditions: 'Direct deduction from daily sales account or MoMo sweep.',
        isFeatured: false,
        displayOrder: 1,
        imageUrl: '/images/cbg_logo.png'
      }
    ]
  }
];

export async function seedInstitutionsData() {
  try {
    console.log('🏦 Checking and seeding default Financial Institutions...');
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    for (const instData of institutionsToSeed) {
      // 1. Upsert Institution
      let institution = await Institution.findOne({ name: instData.name });
      if (!institution) {
        institution = await Institution.create({
          name: instData.name,
          legalName: instData.legalName,
          type: instData.type,
          registrationNumber: instData.registrationNumber,
          taxId: instData.taxId,
          email: instData.email,
          phoneNumber: instData.phoneNumber,
          website: instData.website,
          logoUrl: instData.logoUrl,
          description: instData.description,
          streetAddress: instData.streetAddress,
          city: instData.city,
          state: instData.state,
          country: instData.country,
          postalCode: instData.postalCode,
          isActive: true,
          isVerified: true,
          creditLimit: instData.creditLimit,
          currentCreditUsed: 0,
          subscriptionFee: instData.subscriptionFee,
          connectionFee: instData.connectionFee,
          accumulatedArrears: 0,
          billingCycle: 'monthly',
          billingStatus: 'Active',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastBillingDate: new Date(),
          coreBankingApiUrl: `https://api.${instData.name.toLowerCase().replace(/\s+/g, '')}.resolvebridge.com/v1`,
          coreBankingAutoDisburse: true,
          interestRepaymentFrequency: 'monthly'
        });
        console.log(`   ✅ Created Institution: ${instData.legalName}`);
      } else {
        institution.legalName = instData.legalName;
        institution.type = instData.type;
        institution.isActive = true;
        institution.isVerified = true;
        institution.creditLimit = instData.creditLimit;
        if (instData.logoUrl) institution.logoUrl = instData.logoUrl;
        if (instData.website) institution.website = instData.website;
        await institution.save();
      }

      // 2. Upsert Institution Admin User
      let adminUser = await User.findOne({ email: instData.adminEmail.toLowerCase() });
      if (!adminUser) {
        adminUser = await User.create({
          email: instData.adminEmail.toLowerCase(),
          phoneNumber: instData.adminPhone,
          firstName: instData.adminFirstName,
          lastName: instData.adminLastName,
          password: defaultPasswordHash,
          market: 'Ghana',
          role: 'InstitutionAdmin',
          kycStatus: 'Verified',
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          institutionId: institution._id,
          mustResetPassword: false,
          permissions: [
            'view_applications',
            'approve_applications',
            'reject_applications',
            'disburse_loans',
            'manage_products',
            'view_analytics',
            'view_audit_logs'
          ]
        });
        console.log(`   👤 Created Institution Admin Account: ${adminUser.email}`);
      } else {
        adminUser.institutionId = institution._id as any;
        adminUser.role = 'InstitutionAdmin';
        adminUser.isActive = true;
        adminUser.kycStatus = 'Verified';
        await adminUser.save();
      }

      // 3. Upsert Products for this institution
      for (const prodData of instData.products) {
        let product = await FinancialProduct.findOne({
          name: prodData.name,
          institutionId: institution._id
        });

        if (!product) {
          product = await FinancialProduct.create({
            name: prodData.name,
            description: prodData.description,
            productType: prodData.productType,
            institutionId: institution._id,
            minAmount: prodData.minAmount,
            maxAmount: prodData.maxAmount,
            interestRate: prodData.interestRate,
            minTenureMonths: prodData.minTenureMonths,
            maxTenureMonths: prodData.maxTenureMonths,
            requirements: prodData.requirements,
            benefits: prodData.benefits,
            termsAndConditions: prodData.termsAndConditions,
            isActive: true,
            isFeatured: prodData.isFeatured,
            displayOrder: prodData.displayOrder,
            imageUrl: prodData.imageUrl || institution.logoUrl || ''
          });
          console.log(`   📦 Seeded Product: ${prodData.name} (${institution.name})`);
        } else {
          product.isActive = true;
          product.interestRate = prodData.interestRate;
          product.minAmount = prodData.minAmount;
          product.maxAmount = prodData.maxAmount;
          await product.save();
        }
      }
    }

    console.log('✅ Financial Institutions, Products, and Admins seeded successfully!');
  } catch (error: any) {
    console.error('❌ Error seeding institutions:', error.message);
  }
}

// If executed directly from CLI
if (require.main === module) {
  (async () => {
    try {
      console.log('🍃 Direct seed execution...');
      await mongoose.connect(DATABASE_URL);
      await seedInstitutionsData();
      process.exit(0);
    } catch (e: any) {
      console.error('❌ Connection failed:', e.message);
      process.exit(1);
    }
  })();
}
