import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from '../models/subscriptionPlan.model';

dotenv.config();

const subscriptionPlans = [
  {
    name: 'Basic',
    tier: 'basic',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Get started with essential financial tools',
    features: [
      {
        name: 'Credit Score Monitoring',
        description: 'Track your institutional credit score',
        icon: 'CreditCardRounded',
      },
    ],
    maxLoans: 2,
    maxApplications: 3,
    prioritySupport: false,
    advisorAccess: false,
    fraudProtection: false,
    investmentInsights: false,
    businessTools: false,
    educationCourses: false,
    debtDashboard: false,
    vipConcierge: false,
    eligibilityChecker: false,
    creditMonitoring: true,
    isActive: true,
    displayOrder: 1,
  },
  {
    name: 'Standard',
    tier: 'standard',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    description: 'Unlock essential premium features',
    features: [
      {
        name: 'Credit Score Monitoring',
        description: 'Track and improve your institutional score',
        icon: 'CreditCardRounded',
      },
      {
        name: 'Loan Eligibility Checker',
        description: 'Estimate approval chances instantly',
        icon: 'SecurityRounded',
      },
      {
        name: 'Debt Management Dashboard',
        description: 'Track and optimize all your loans',
        icon: 'TrendingDownRounded',
      },
    ],
    maxLoans: 5,
    maxApplications: 10,
    prioritySupport: true,
    advisorAccess: false,
    fraudProtection: false,
    investmentInsights: false,
    businessTools: false,
    educationCourses: false,
    debtDashboard: true,
    vipConcierge: false,
    eligibilityChecker: true,
    creditMonitoring: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    name: 'Premium',
    tier: 'premium',
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    description: 'Advanced tools for serious growth',
    features: [
      {
        name: 'Credit Score Monitoring',
        description: 'Real-time institutional credit tracking',
        icon: 'CreditCardRounded',
      },
      {
        name: 'Loan Eligibility Checker',
        description: 'Match with verified institutional lenders',
        icon: 'SecurityRounded',
      },
      {
        name: 'AI Financial Advisor',
        description: 'Personalized guidance from advanced AI',
        icon: 'SmartToyRounded',
      },
      {
        name: 'Investment Insights',
        description: 'Treasury bills and market opportunities',
        icon: 'TrendingUpRounded',
      },
      {
        name: 'Fraud Protection Alerts',
        description: 'Real-time security monitoring',
        icon: 'ShieldRounded',
      },
      {
        name: 'Debt Management Dashboard',
        description: 'Advanced debt optimization strategies',
        icon: 'TrendingDownRounded',
      },
      {
        name: 'Premium Financial Education',
        description: 'Expert courses and certifications',
        icon: 'SchoolRounded',
      },
    ],
    maxLoans: 20,
    maxApplications: 50,
    prioritySupport: true,
    advisorAccess: true,
    fraudProtection: true,
    investmentInsights: true,
    businessTools: true,
    educationCourses: true,
    debtDashboard: true,
    vipConcierge: false,
    eligibilityChecker: true,
    creditMonitoring: true,
    isActive: true,
    displayOrder: 3,
  },
  {
    name: 'Elite',
    tier: 'elite',
    monthlyPrice: 99.99,
    yearlyPrice: 999.99,
    description: 'Complete financial empowerment',
    features: [
      {
        name: 'Credit Score Monitoring',
        description: 'Professional-grade credit analysis',
        icon: 'CreditCardRounded',
      },
      {
        name: 'Loan Eligibility Checker',
        description: 'Unlimited institutional lender matching',
        icon: 'SecurityRounded',
      },
      {
        name: 'AI Financial Advisor',
        description: '24/7 dedicated AI financial guidance',
        icon: 'SmartToyRounded',
      },
      {
        name: 'Investment Insights',
        description: 'Advanced portfolio and treasury analysis',
        icon: 'TrendingUpRounded',
      },
      {
        name: 'Fraud Protection Alerts',
        description: 'Enterprise-grade security monitoring',
        icon: 'ShieldRounded',
      },
      {
        name: 'Business Finance Tools',
        description: 'SME growth and cash flow optimization',
        icon: 'AssignmentRounded',
      },
      {
        name: 'Premium Financial Education',
        description: 'Unlimited courses and certifications',
        icon: 'SchoolRounded',
      },
      {
        name: 'Debt Management Dashboard',
        description: 'Enterprise debt optimization',
        icon: 'TrendingDownRounded',
      },
      {
        name: 'VIP Concierge Support',
        description: 'Dedicated account manager 24/7',
        icon: 'EmojiEventsRounded',
      },
    ],
    maxLoans: 999,
    maxApplications: 999,
    prioritySupport: true,
    advisorAccess: true,
    fraudProtection: true,
    investmentInsights: true,
    businessTools: true,
    educationCourses: true,
    debtDashboard: true,
    vipConcierge: true,
    eligibilityChecker: true,
    creditMonitoring: true,
    isActive: true,
    displayOrder: 4,
  },
];

const seedSubscriptionPlans = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/resolvebridge';
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    // Insert new plans
    await SubscriptionPlan.insertMany(subscriptionPlans);
    console.log('✅ Successfully seeded subscription plans');

    subscriptionPlans.forEach((plan) => {
      console.log(`  - ${plan.name} (${plan.tier}): GH₵${plan.monthlyPrice}/month`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    process.exit(1);
  }
};

seedSubscriptionPlans();
