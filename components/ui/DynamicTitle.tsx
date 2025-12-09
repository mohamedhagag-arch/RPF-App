'use client'

import { useEffect, useState } from 'react'
import { getCachedCompanySettings } from '@/lib/companySettings'

interface DynamicTitleProps {
  pageTitle?: string
  showCompanyName?: boolean
  showCompanySlogan?: boolean
}

export function DynamicTitle({ pageTitle, showCompanyName = true, showCompanySlogan = true }: DynamicTitleProps) {
  const [companyName, setCompanyName] = useState('AlRabat RPF')
  const [companySlogan, setCompanySlogan] = useState('Masters of Foundation Construction')

  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        console.log('🔄 Loading company settings for dynamic title...')
        const settings = await getCachedCompanySettings()
        
        setCompanyName(settings.company_name)
        setCompanySlogan(settings.company_slogan)
        
        console.log('✅ Company settings loaded for title:', settings)
      } catch (error) {
        console.error('❌ Error loading company settings for title:', error)
        // استخدام القيم الافتراضية في حالة الخطأ
        setCompanyName('AlRabat RPF')
        setCompanySlogan('Masters of Foundation Construction')
      }
    }
    
    loadCompanySettings()
    
    // إضافة مستمع لتحديثات إعدادات الشركة
    const handleStorageChange = () => {
      loadCompanySettings()
    }
    
    // الاستماع لتغييرات localStorage (إذا تم استخدامه)
    window.addEventListener('storage', handleStorageChange)
    
    // الاستماع لتحديثات مخصصة
    window.addEventListener('companySettingsUpdated', handleStorageChange)
    window.addEventListener('companySettingsCacheCleared', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('companySettingsUpdated', handleStorageChange)
      window.removeEventListener('companySettingsCacheCleared', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    // تحديث عنوان التاب بناءً على إعدادات الشركة
    const updateTitle = () => {
      let title = ''
      
      if (showCompanyName) {
        if (pageTitle) {
          // إضافة الوصف بجانب الاسم إذا كان مفعلاً
          if (showCompanySlogan) {
            title = `${pageTitle} - ${companyName} - ${companySlogan}`
          } else {
            title = `${pageTitle} - ${companyName}`
          }
        } else {
          // إضافة الوصف بجانب الاسم إذا كان مفعلاً
          if (showCompanySlogan) {
            title = `${companyName} - ${companySlogan}`
          } else {
            title = companyName
          }
        }
      } else if (pageTitle) {
        title = pageTitle
      } else {
        title = companyName
      }
      
      // تحديث عنوان التاب
      document.title = title
      console.log('📝 Browser tab title updated:', title)
    }
    
    updateTitle()
  }, [companyName, companySlogan, pageTitle, showCompanyName, showCompanySlogan])

  // لا نعيد أي JSX لأن هذا المكون فقط لتحديث العنوان
  return null
}

export default DynamicTitle
