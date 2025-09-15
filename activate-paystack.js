#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Activating Paystack for Dokploy...\n');

// Check environment file
const envPath = path.join(__dirname, 'apps/dokploy/.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at apps/dokploy/.env');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Check required Paystack variables
const requiredVars = [
  'PAYSTACK_ENABLED',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
  'BASE_PRICE_MONTHLY_ID',
  'BASE_ANNUAL_MONTHLY_ID'
];

console.log('✅ Checking Paystack configuration...');

const missingVars = [];
requiredVars.forEach(varName => {
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (!match || !match[1] || match[1].trim() === '') {
    missingVars.push(varName);
  } else {
    console.log(`   ✓ ${varName}: ${match[1].startsWith('pk_') || match[1].startsWith('sk_') ? '***' : match[1]}`);
  }
});

if (missingVars.length > 0) {
  console.log('\n❌ Missing or empty Paystack configuration:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 Please update your .env file with the missing values.');
  process.exit(1);
}

// Check if PAYSTACK_ENABLED is true
const paystackEnabledMatch = envContent.match(/^PAYSTACK_ENABLED=(.+)$/m);
if (!paystackEnabledMatch || paystackEnabledMatch[1].trim() !== 'true') {
  console.log('\n⚠️  PAYSTACK_ENABLED is not set to true');
  process.exit(1);
}

console.log('\n🎉 Paystack is properly configured and activated!');
console.log('\n📋 Configuration Summary:');
console.log('   • Payment processing: Enabled');
console.log('   • Monthly plan: Configured');
console.log('   • Annual plan: Configured');
console.log('   • Webhook endpoint: /api/paystack/webhook');

console.log('\n🔧 Next steps:');
console.log('   1. Set up webhook in Paystack dashboard');
console.log('   2. Update PAYSTACK_WEBHOOK_SECRET with actual secret');
console.log('   3. Test payment flow in development');
console.log('   4. Start the application with: pnpm run dokploy:dev');

console.log('\n✨ Paystack activation complete!');