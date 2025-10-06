#!/usr/bin/env node

/**
 * Verify Data in Supabase
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI'
};

async function verifyData() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║           🔍 التحقق من البيانات في Supabase         ║
╚═══════════════════════════════════════════════════════╝
`);

  try {
    // Check Projects
    console.log('\n📊 المشاريع:');
    const { data: projects, error: projectsError } = await supabase
      .from(TABLES.PROJECTS)
      .select('*', { count: 'exact', head: true });
    
    if (projectsError) throw projectsError;
    console.log(`   ✅ عدد المشاريع: ${projects || 0}`);
    
    // Get sample project
    const { data: sampleProject } = await supabase
      .from(TABLES.PROJECTS)
      .select('*')
      .limit(1);
    
    if (sampleProject && sampleProject[0]) {
      console.log(`   📝 مثال: ${sampleProject[0]['Project Name'] || 'N/A'}`);
      console.log(`   🔢 كود: ${sampleProject[0]['Project Code'] || 'N/A'}`);
    }

    // Check BOQ
    console.log('\n📋 أنشطة BOQ:');
    const { data: boq, error: boqError } = await supabase
      .from(TABLES.BOQ)
      .select('*', { count: 'exact', head: true });
    
    if (boqError) throw boqError;
    console.log(`   ✅ عدد الأنشطة: ${boq || 0}`);
    
    // Get sample BOQ
    const { data: sampleBOQ } = await supabase
      .from(TABLES.BOQ)
      .select('*')
      .limit(1);
    
    if (sampleBOQ && sampleBOQ[0]) {
      console.log(`   📝 مثال: ${sampleBOQ[0]['Activity Name'] || 'N/A'}`);
      console.log(`   🔢 كود المشروع: ${sampleBOQ[0]['Project Code'] || 'N/A'}`);
    }

    // Check KPI
    console.log('\n📈 سجلات KPI:');
    const { data: kpi, error: kpiError } = await supabase
      .from(TABLES.KPI)
      .select('*', { count: 'exact', head: true });
    
    if (kpiError) throw kpiError;
    console.log(`   ✅ عدد السجلات: ${kpi || 0}`);
    
    // Get sample KPI
    const { data: sampleKPI } = await supabase
      .from(TABLES.KPI)
      .select('*')
      .limit(1);
    
    if (sampleKPI && sampleKPI[0]) {
      console.log(`   📝 اسم النشاط: ${sampleKPI[0]['Activity Name'] || 'N/A'}`);
      console.log(`   🔢 كود المشروع: ${sampleKPI[0]['Project Full Code'] || 'N/A'}`);
    }

    // Check for duplicates
    console.log('\n🔍 التحقق من التكرار:');
    const { count: projectCount } = await supabase
      .from(TABLES.PROJECTS)
      .select('*', { count: 'exact', head: true });
    
    const { count: boqCount } = await supabase
      .from(TABLES.BOQ)
      .select('*', { count: 'exact', head: true });
    
    const { count: kpiCount } = await supabase
      .from(TABLES.KPI)
      .select('*', { count: 'exact', head: true });

    console.log(`
╔═══════════════════════════════════════════════════════╗
║                    📊 الملخص النهائي                 ║
╠═══════════════════════════════════════════════════════╣
║  ✅ المشاريع:          ${String(projectCount).padStart(6)}                    ║
║  ✅ أنشطة BOQ:         ${String(boqCount).padStart(6)}                    ║
║  ✅ سجلات KPI:         ${String(kpiCount).padStart(6)}                    ║
╠═══════════════════════════════════════════════════════╣
║  📦 المجموع:           ${String(projectCount + boqCount + kpiCount).padStart(6)}                    ║
╚═══════════════════════════════════════════════════════╝
`);

    if (projectCount === 324 && boqCount === 1598 && kpiCount === 18527) {
      console.log('✅ البيانات صحيحة بدون تكرار!\n');
    } else if (boqCount === 3196 || kpiCount === 37054) {
      console.log('⚠️  تحذير: البيانات مكررة! شغّل scripts/import-to-public.js\n');
    } else {
      console.log('⚠️  تحذير: عدد السجلات غير متوقع!\n');
    }

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    process.exit(1);
  }
}

verifyData();

