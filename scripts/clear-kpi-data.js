const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ إعدادات الحذف المحسّنة
const FETCH_BATCH_SIZE = 10000; // جلب 10,000 صف في كل مرة
const DELETE_CHUNK_SIZE = 300; // حذف 300 صف في كل عملية (آمن مع UUIDs طويلة)
const PARALLEL_CHUNKS = 10; // عدد الـ chunks التي تُحذف بشكل متوازي
const TABLE_NAME = 'Planning Database - KPI'; // اسم الجدول

/**
 * حذف كل البيانات من جدول KPI
 */
async function clearKPIData() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     🗑️  Clear All KPI Data from Supabase         ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // التحقق من عدد الصفوف
    console.log('📊 Checking table size...');
    const { count, error: countError } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error checking table:', countError);
      process.exit(1);
    }
    
    if (!count || count === 0) {
      console.log('✅ Table is already empty!');
      return;
    }
    
    console.log(`📊 Found ${count.toLocaleString()} rows to delete`);
    console.log('');
    
    // تأكيد من المستخدم
    console.log('⚠️  WARNING: This will delete ALL data from the KPI table!');
    console.log(`⚠️  Total rows to delete: ${count.toLocaleString()}`);
    console.log('');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    console.log('');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🚀 Starting deletion process...');
    console.log('');
    
    let totalDeleted = 0;
    let batchNumber = 0;
    let iterations = 0;
    let checkRemainingCounter = 0;
    const maxIterations = Math.ceil(count / DELETE_CHUNK_SIZE) + 100;
    const startTime = Date.now();
    
    // ✅ استمر في الحذف حتى لا يوجد المزيد من البيانات
    while (iterations < maxIterations) {
      iterations++;
      batchNumber++;
      checkRemainingCounter++;
      
      // التحقق من عدد الصفوف المتبقية كل 10 batches فقط
      if (checkRemainingCounter >= 10) {
        checkRemainingCounter = 0;
        const { count: remainingCount } = await supabase
          .from(TABLE_NAME)
          .select('*', { count: 'exact', head: true });
        
        if (!remainingCount || remainingCount === 0) {
          console.log('✅ No more rows to delete. All data cleared!');
          break;
        }
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = totalDeleted / (elapsed / 60); // rows per minute
        console.log(`📊 Progress: ${totalDeleted.toLocaleString()}/${count.toLocaleString()} deleted (${remainingCount.toLocaleString()} remaining)`);
        console.log(`   ⏱️  Elapsed: ${elapsed}s | Rate: ${Math.round(rate).toLocaleString()} rows/min`);
        console.log('');
      }
      
      // جلب batch من IDs للحذف
      const { data: batchData, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .limit(FETCH_BATCH_SIZE);
      
      if (fetchError) {
        console.error(`❌ Error fetching batch for deletion:`, fetchError);
        process.exit(1);
      }
      
      if (!batchData || batchData.length === 0) {
        console.log('✅ No more rows found. All data cleared!');
        break;
      }
      
      // حذف الـ batch
      const idsToDelete = batchData
        .map(row => row.id)
        .filter(Boolean);
      
      if (idsToDelete.length > 0) {
        // ✅ تقسيم الـ IDs إلى chunks أصغر
        const chunks = [];
        for (let i = 0; i < idsToDelete.length; i += DELETE_CHUNK_SIZE) {
          chunks.push(idsToDelete.slice(i, i + DELETE_CHUNK_SIZE));
        }
        
        // ✅ حذف الـ chunks بشكل متوازي
        for (let chunkGroupIndex = 0; chunkGroupIndex < chunks.length; chunkGroupIndex += PARALLEL_CHUNKS) {
          const chunkGroup = chunks.slice(chunkGroupIndex, chunkGroupIndex + PARALLEL_CHUNKS);
          
          // حذف مجموعة من الـ chunks بشكل متوازي
          const deletePromises = chunkGroup.map(async (chunk, index) => {
            const chunkIndex = chunkGroupIndex + index;
            const { error: deleteError } = await supabase
              .from(TABLE_NAME)
              .delete()
              .in('id', chunk);
            
            if (deleteError) {
              throw { error: deleteError, chunkIndex: chunkIndex + 1, totalChunks: chunks.length };
            }
            
            return chunk.length;
          });
          
          try {
            const deletedCounts = await Promise.all(deletePromises);
            const groupTotal = deletedCounts.reduce((sum, count) => sum + count, 0);
            totalDeleted += groupTotal;
            
            process.stdout.write(`\r   ✅ Batch ${batchNumber}: ${totalDeleted.toLocaleString()}/${count.toLocaleString()} deleted (${Math.round((totalDeleted / count) * 100)}%)`);
          } catch (err) {
            const errorInfo = err;
            console.error(`\n❌ Error deleting chunk ${errorInfo.chunkIndex}/${errorInfo.totalChunks} of batch ${batchNumber}:`, errorInfo.error);
            process.exit(1);
          }
          
          // تأخير صغير جداً بين مجموعات الـ chunks
          if (chunkGroupIndex + PARALLEL_CHUNKS < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }
      
      // تأخير صغير جداً بين الـ batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('');
    console.log('');
    
    // التحقق النهائي
    const { count: finalCount } = await supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = totalDeleted / (elapsed / 60);
    
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║              ✅ Deletion Complete!                  ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Total deleted:     ${String(totalDeleted.toLocaleString()).padStart(15)}        ║`);
    console.log(`║  Remaining rows:   ${String((finalCount || 0).toLocaleString()).padStart(15)}        ║`);
    console.log(`║  Time elapsed:     ${String(`${elapsed}s`).padStart(15)}        ║`);
    console.log(`║  Deletion rate:    ${String(`${Math.round(rate).toLocaleString()} rows/min`).padStart(15)}        ║`);
    console.log('╚════════════════════════════════════════════════════╝');
    
    if (finalCount && finalCount > 0) {
      console.log('');
      console.log(`⚠️  Warning: ${finalCount.toLocaleString()} rows still remain. You may need to run the script again.`);
    } else {
      console.log('');
      console.log('✅ All data successfully deleted!');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Error during deletion:', error);
    process.exit(1);
  }
}

// تشغيل الـ script
clearKPIData()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

