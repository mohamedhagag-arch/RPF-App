/**
 * 🎯 Best Practices for Data Import
 * 
 * أفضل الممارسات لرفع البيانات لضمان عمل التحليل بشكل صحيح
 * 
 * This file contains guidelines and helper functions for importing data
 * to ensure all calculations and analysis work correctly.
 */

import { TABLES } from './supabase'

/**
 * ✅ Required Fields for BOQ Activities Import
 * الحقول المطلوبة لاستيراد أنشطة BOQ
 */
export const REQUIRED_BOQ_FIELDS = [
  'Project Code',           // ✅ مطلوب - لربط النشاط بالمشروع
  'Activity Name',          // ✅ مطلوب - اسم النشاط
  'Total Units',            // ✅ مطلوب - الكمية الإجمالية
  'Planned Units',          // ✅ مطلوب - الكمية المخططة
  'Rate',                   // ✅ مطلوب - السعر
  'Total Value',            // ✅ مطلوب - القيمة الإجمالية
] as const

/**
 * ✅ Recommended Fields for BOQ Activities Import
 * الحقول الموصى بها لاستيراد أنشطة BOQ
 */
export const RECOMMENDED_BOQ_FIELDS = [
  'Project Sub Code',      // موصى به - للربط الدقيق
  'Project Full Code',      // موصى به - للربط الدقيق
  'Activity',               // موصى به - نوع النشاط
  'Activity Division',      // موصى به - القسم
  'Unit',                   // موصى به - الوحدة
  'Planned Activity Start Date', // موصى به - تاريخ البدء
  'Deadline',               // موصى به - الموعد النهائي
  'Calendar Duration',      // موصى به - المدة
] as const

/**
 * ✅ Required Fields for Projects Import
 * الحقول المطلوبة لاستيراد المشاريع
 */
export const REQUIRED_PROJECT_FIELDS = [
  'Project Code',          // ✅ مطلوب
  'Project Name',          // ✅ مطلوب
  'Project Type',           // ✅ مطلوب
  'Responsible Division',   // ✅ مطلوب
] as const

/**
 * ✅ Required Fields for KPI Import
 * الحقول المطلوبة لاستيراد KPIs
 */
export const REQUIRED_KPI_FIELDS = [
  'Project Full Code',     // ✅ مطلوب
  'Activity Name',         // ✅ مطلوب
  'Input Type',            // ✅ مطلوب (Planned أو Actual)
  'Quantity',              // ✅ مطلوب
  'Date',                  // ✅ مطلوب
] as const

/**
 * Validate BOQ data before import
 * التحقق من بيانات BOQ قبل الاستيراد
 */
export function validateBOQData(data: any[]): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data || data.length === 0) {
    errors.push('No data provided')
    return { valid: false, errors, warnings }
  }

  data.forEach((row, index) => {
    const rowNum = index + 1

    // Check required fields
    if (!row['Project Code'] && !row['project_code']) {
      errors.push(`Row ${rowNum}: Missing 'Project Code'`)
    }

    if (!row['Activity Name'] && !row['activity_name'] && !row['Activity']) {
      errors.push(`Row ${rowNum}: Missing 'Activity Name'`)
    }

    // Check numeric fields
    const totalUnits = parseFloat(row['Total Units'] || row['total_units'] || '0')
    const plannedUnits = parseFloat(row['Planned Units'] || row['planned_units'] || '0')
    const rate = parseFloat(row['Rate'] || row['rate'] || '0')
    const totalValue = parseFloat(row['Total Value'] || row['total_value'] || '0')

    if (isNaN(totalUnits) || totalUnits < 0) {
      warnings.push(`Row ${rowNum}: Invalid 'Total Units' (${row['Total Units']})`)
    }

    if (isNaN(plannedUnits) || plannedUnits < 0) {
      warnings.push(`Row ${rowNum}: Invalid 'Planned Units' (${row['Planned Units']})`)
    }

    if (isNaN(rate) || rate < 0) {
      warnings.push(`Row ${rowNum}: Invalid 'Rate' (${row['Rate']})`)
    }

    if (isNaN(totalValue) || totalValue < 0) {
      warnings.push(`Row ${rowNum}: Invalid 'Total Value' (${row['Total Value']})`)
    }

    // Check if Total Value matches calculation
    const calculatedValue = plannedUnits * rate
    if (totalValue > 0 && Math.abs(totalValue - calculatedValue) > 0.01) {
      warnings.push(
        `Row ${rowNum}: 'Total Value' (${totalValue}) doesn't match calculation (Planned Units × Rate = ${calculatedValue})`
      )
    }

    // Check Project Code format
    const projectCode = row['Project Code'] || row['project_code'] || ''
    if (projectCode && !/^P\d+/.test(projectCode)) {
      warnings.push(`Row ${rowNum}: 'Project Code' format may be incorrect (${projectCode})`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Prepare BOQ data for import (clean and normalize)
 * تحضير بيانات BOQ للاستيراد (تنظيف وتوحيد)
 */
export function prepareBOQDataForImport(data: any[]): any[] {
  return data.map((row, index) => {
    const cleanedRow: any = {}

    // Normalize column names (support both formats)
    const getValue = (dbName: string, altName?: string) => {
      return row[dbName] || row[altName || dbName.toLowerCase().replace(/\s+/g, '_')] || ''
    }

    // Required fields
    cleanedRow['Project Code'] = getValue('Project Code', 'project_code') || ''
    cleanedRow['Activity Name'] = getValue('Activity Name', 'activity_name') || getValue('Activity', 'activity') || ''
    cleanedRow['Total Units'] = String(getValue('Total Units', 'total_units') || '0')
    cleanedRow['Planned Units'] = String(getValue('Planned Units', 'planned_units') || '0')
    cleanedRow['Rate'] = String(getValue('Rate', 'rate') || '0')
    cleanedRow['Total Value'] = String(getValue('Total Value', 'total_value') || '0')

    // Recommended fields
    cleanedRow['Project Sub Code'] = getValue('Project Sub Code', 'project_sub_code') || ''
    cleanedRow['Project Full Code'] = getValue('Project Full Code', 'project_full_code') || cleanedRow['Project Code']
    cleanedRow['Activity'] = getValue('Activity', 'activity') || cleanedRow['Activity Name']
    cleanedRow['Activity Division'] = getValue('Activity Division', 'activity_division') || ''
    cleanedRow['Unit'] = getValue('Unit', 'unit') || ''
    cleanedRow['Planned Activity Start Date'] = getValue('Planned Activity Start Date', 'planned_activity_start_date') || ''
    cleanedRow['Deadline'] = getValue('Deadline', 'deadline') || ''
    cleanedRow['Calendar Duration'] = String(getValue('Calendar Duration', 'calendar_duration') || '0')

    // Optional fields
    cleanedRow['Zone Ref'] = getValue('Zone Ref', 'zone_ref') || ''
    cleanedRow['Zone Number'] = getValue('Zone Number', 'zone_number') || getValue('Zone #', 'zone_number') || ''
    cleanedRow['Project Full Name'] = getValue('Project Full Name', 'project_full_name') || ''
    cleanedRow['Project Status'] = getValue('Project Status', 'project_status') || 'active'
    cleanedRow['Activity Timing'] = getValue('Activity Timing', 'activity_timing') || 'post-commencement'
    cleanedRow['Has Value'] = getValue('Has Value', 'has_value') || 'TRUE'
    cleanedRow['Affects Timeline'] = getValue('Affects Timeline', 'affects_timeline') || 'FALSE'

    // Remove empty optional fields to avoid database errors
    Object.keys(cleanedRow).forEach(key => {
      if (cleanedRow[key] === '' || cleanedRow[key] === null || cleanedRow[key] === undefined) {
        // Keep required fields even if empty
        if (!REQUIRED_BOQ_FIELDS.includes(key as any)) {
          delete cleanedRow[key]
        }
      }
    })

    return cleanedRow
  })
}

/**
 * Get import checklist for BOQ Activities
 * قائمة التحقق من الاستيراد لأنشطة BOQ
 */
export function getBOQImportChecklist(): string[] {
  return [
    '✅ تأكد من وجود جميع الحقول المطلوبة: Project Code, Activity Name, Total Units, Planned Units, Rate, Total Value',
    '✅ تأكد من أن أسماء الأعمدة صحيحة (مع مسافات): "Project Code" وليس "project_code"',
    '✅ تأكد من أن Project Code موجود في جدول Projects قبل الاستيراد',
    '✅ تأكد من أن القيم الرقمية صحيحة (أرقام وليست نصوص)',
    '✅ تأكد من أن Total Value = Planned Units × Rate (سيتم إعادة الحساب تلقائياً)',
    '✅ استخدم Template من Database Management لضمان التنسيق الصحيح',
    '✅ بعد الاستيراد، انتظر حتى تكتمل الحسابات التلقائية (ستظهر في Console)',
    '✅ تحقق من النتائج في صفحة BOQ Management',
  ]
}

/**
 * Get import order recommendation
 * ترتيب الاستيراد الموصى به
 */
export function getRecommendedImportOrder(): string[] {
  return [
    '1️⃣ Projects أولاً - يجب استيراد المشاريع قبل الأنشطة',
    '2️⃣ BOQ Activities ثانياً - بعد استيراد المشاريع',
    '3️⃣ KPIs أخيراً - بعد استيراد الأنشطة (اختياري)',
  ]
}

/**
 * Format validation summary for display
 * تنسيق ملخص التحقق للعرض
 */
export function formatValidationSummary(validation: {
  valid: boolean
  errors: string[]
  warnings: string[]
}): string {
  let summary = ''

  if (validation.valid) {
    summary += '✅ البيانات صالحة للاستيراد\n\n'
  } else {
    summary += '❌ يوجد أخطاء يجب إصلاحها:\n'
    validation.errors.forEach(error => {
      summary += `  • ${error}\n`
    })
    summary += '\n'
  }

  if (validation.warnings.length > 0) {
    summary += '⚠️ تحذيرات (لا تمنع الاستيراد):\n'
    validation.warnings.forEach(warning => {
      summary += `  • ${warning}\n`
    })
  }

  return summary
}




