#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '../.env.local' });

const { importAllData } = require('./import-data.js');

console.log('🚀 Rabat MVP - Quick Data Import');
console.log('================================\n');

// Check if .env.local exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.error('Please create .env.local file with your Supabase credentials:');
  console.error(`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  `);
  process.exit(1);
}

// Check if CSV files exist
const csvFiles = [
  '../Database/Planning Database - ProjectsList.csv',
  '../Database/Planning Database - BOQ Rates .csv',
  '../Database/Planning Database - KPI.csv'
];

const missingFiles = csvFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));

if (missingFiles.length > 0) {
  console.error('❌ Missing CSV files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  console.error('\nPlease ensure all CSV files are in the Database/ folder');
  process.exit(1);
}

console.log('✅ Environment and files check passed');
console.log('📊 Starting data import...\n');

// Run the import
importAllData()
  .then(() => {
    console.log('\n🎉 Import completed successfully!');
    console.log('You can now run your application with: npm run dev');
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  });
