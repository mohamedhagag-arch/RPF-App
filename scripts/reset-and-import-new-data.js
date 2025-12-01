#!/usr/bin/env node

/**
 * Reset Supabase Data and Import New Data from "clear data" folder
 * 
 * This script:
 * 1. Deletes all old data from Supabase (Projects, BOQ, KPI)
 * 2. Imports new data from Database/clear data/ folder
 */

const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'planning'
  }
});

// Table names in planning schema
const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI'
};

// CSV file paths
const CSV_FOLDER = path.join(__dirname, '../Database/clear data');
const CSV_FILES = {
  PROJECTS: path.join(CSV_FOLDER, 'Planning Database - ProjectsList.csv'),
  BOQ: path.join(CSV_FOLDER, 'Planning Database - BOQ Rates .csv'),
  KPI: path.join(CSV_FOLDER, 'Planning Database - KPI .csv')
};

/**
 * Delete all data from a table
 */
async function deleteAllData(tableName) {
  console.log(`\n🗑️  Deleting all data from: ${tableName}`);
  
  try {
    const { error, count } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition)
    
    if (error) {
      console.error(`❌ Error deleting from ${tableName}:`, error.message);
      return false;
    }
    
    console.log(`✅ Deleted all data from ${tableName}`);
    return true;
  } catch (err) {
    console.error(`❌ Error:`, err.message);
    return false;
  }
}

/**
 * Read CSV file and return data
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Import Projects
 */
async function importProjects() {
  console.log('\n📊 Importing Projects...');
  
  try {
    const data = await readCSV(CSV_FILES.PROJECTS);
    console.log(`   Found ${data.length} projects in CSV`);
    
    // Insert in batches of 100
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(TABLES.PROJECTS)
        .insert(batch);
      
      if (error) {
        console.error(`   ⚠️ Batch ${i}-${i + batch.length} error:`, error.message);
      } else {
        imported += batch.length;
        console.log(`   ✅ Imported ${imported}/${data.length} projects`);
      }
    }
    
    console.log(`✅ Total projects imported: ${imported}`);
    return imported;
  } catch (error) {
    console.error('❌ Error importing projects:', error.message);
    return 0;
  }
}

/**
 * Import BOQ Activities
 */
async function importBOQ() {
  console.log('\n📋 Importing BOQ Activities...');
  
  try {
    const data = await readCSV(CSV_FILES.BOQ);
    console.log(`   Found ${data.length} activities in CSV`);
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(TABLES.BOQ)
        .insert(batch);
      
      if (error) {
        console.error(`   ⚠️ Batch ${i}-${i + batch.length} error:`, error.message);
      } else {
        imported += batch.length;
        console.log(`   ✅ Imported ${imported}/${data.length} activities`);
      }
    }
    
    console.log(`✅ Total BOQ activities imported: ${imported}`);
    return imported;
  } catch (error) {
    console.error('❌ Error importing BOQ:', error.message);
    return 0;
  }
}

/**
 * Import KPI Records
 */
async function importKPI() {
  console.log('\n📈 Importing KPI Records...');
  
  try {
    const data = await readCSV(CSV_FILES.KPI);
    console.log(`   Found ${data.length} KPI records in CSV`);
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(TABLES.KPI)
        .insert(batch);
      
      if (error) {
        console.error(`   ⚠️ Batch ${i}-${i + batch.length} error:`, error.message);
      } else {
        imported += batch.length;
        console.log(`   ✅ Imported ${imported}/${data.length} KPI records`);
      }
    }
    
    console.log(`✅ Total KPI records imported: ${imported}`);
    return imported;
  } catch (error) {
    console.error('❌ Error importing KPI:', error.message);
    return 0;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🔄 Reset & Import New Data from "clear data"   ║');
  console.log('╚════════════════════════════════════════════════════╝');
  
  // Step 1: Delete old data
  console.log('\n📋 Step 1: Deleting old data...');
  console.log('════════════════════════════════════════');
  
  await deleteAllData(TABLES.KPI);      // Delete KPIs first (has foreign keys)
  await deleteAllData(TABLES.BOQ);      // Then BOQ
  await deleteAllData(TABLES.PROJECTS); // Finally Projects
  
  console.log('\n✅ All old data deleted!');
  
  // Step 2: Import new data
  console.log('\n📋 Step 2: Importing new data...');
  console.log('════════════════════════════════════════');
  
  const projectsCount = await importProjects();
  const boqCount = await importBOQ();
  const kpiCount = await importKPI();
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║                  📊 Summary                        ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  Projects imported:        ${String(projectsCount).padStart(6)}                  ║`);
  console.log(`║  BOQ Activities imported:  ${String(boqCount).padStart(6)}                  ║`);
  console.log(`║  KPI Records imported:     ${String(kpiCount).padStart(6)}                  ║`);
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  Total Records:           ${String(projectsCount + boqCount + kpiCount).padStart(7)}                  ║`);
  console.log('╚════════════════════════════════════════════════════╝');
  
  console.log('\n🎉 Import completed successfully!');
  console.log('✅ You can now use the application with the new data.');
  console.log('\n💡 Run: npm run dev');
}

// Run the script
main().catch(console.error);
