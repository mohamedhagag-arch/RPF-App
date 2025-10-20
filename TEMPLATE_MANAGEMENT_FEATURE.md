# 📁 Template Management Feature

## 📋 Overview
تم إضافة ميزة **Template Management** إلى Project Types & Activities Management في Settings. هذه الميزة تسمح بـ:
- **استخراج Templates**: تصدير أنواع المشاريع والأنشطة كـ templates
- **تحميل Templates**: استيراد templates جاهزة
- **إدارة Templates**: تنظيم وتبادل configurations

## 🎯 الميزات الجديدة

### 1. Export All Template (تصدير شامل)
- **الوصف**: تصدير جميع أنواع المشاريع والأنشطة كـ template واحد
- **الملف**: `project-types-template-YYYY-MM-DD.json`
- **المحتوى**: جميع Project Types + جميع Activities + Metadata

### 2. Import Template (استيراد)
- **الوصف**: تحميل template من ملف JSON
- **التنسيق**: يدعم تنسيق JSON المخصص
- **التحقق**: يتحقق من صحة التنسيق قبل الاستيراد

### 3. Export Specific Type (تصدير نوع محدد)
- **الوصف**: تصدير نوع مشروع محدد مع أنشطته
- **الملف**: `project-type-[name]-template-YYYY-MM-DD.json`
- **المحتوى**: Project Type + Activities الخاصة به فقط

## 🎨 واجهة المستخدم

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ Project Types & Activities Management                      │
│ Unified management for project types and their activities │
│ with template support                                      │
│                                                             │
│ [Export Template] [Import Template] [Add Project Type]    │
└─────────────────────────────────────────────────────────────┘
```

### Template Management Card
```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Template Management                                    │
│ Export and import project types and activities as        │
│ templates                                                  │
│                                                             │
│ [Export All] [Import Template]                            │
│                                                             │
│ 📄 Template includes: X project types, Y activities       │
└─────────────────────────────────────────────────────────────┘
```

### Project Type Actions
```
┌─────────────────────────────────────────────────────────────┐
│ Project Type Name                                          │
│ [Add Activity] [Export] [Edit] [Disable] [Delete]         │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Template Structure

### Complete Template Format
```json
{
  "project_types": [
    {
      "name": "Infrastructure",
      "code": "INF",
      "description": "Infrastructure projects",
      "is_active": true
    }
  ],
  "activities": [
    {
      "project_type": "Infrastructure",
      "activity_name": "Bored Piling",
      "activity_name_ar": "الحفر الممل",
      "description": "Deep foundation work",
      "default_unit": "Meter",
      "estimated_rate": 150.00,
      "category": "Piling",
      "typical_duration": 30,
      "division": "Civil Division",
      "display_order": 1,
      "is_active": true
    }
  ],
  "metadata": {
    "exported_at": "2025-01-20T10:30:00.000Z",
    "version": "1.0",
    "total_types": 5,
    "total_activities": 25
  }
}
```

### Specific Type Template Format
```json
{
  "project_type": {
    "name": "Infrastructure",
    "code": "INF",
    "description": "Infrastructure projects",
    "is_active": true
  },
  "activities": [
    {
      "project_type": "Infrastructure",
      "activity_name": "Bored Piling",
      "activity_name_ar": "الحفر الممل",
      "description": "Deep foundation work",
      "default_unit": "Meter",
      "estimated_rate": 150.00,
      "category": "Piling",
      "typical_duration": 30,
      "division": "Civil Division",
      "display_order": 1,
      "is_active": true
    }
  ],
  "metadata": {
    "exported_at": "2025-01-20T10:30:00.000Z",
    "version": "1.0",
    "type_name": "Infrastructure",
    "total_activities": 8
  }
}
```

## 🔧 الوظائف التقنية

### Export Functions
```typescript
// Export all templates
const handleExportTemplate = async () => {
  const templateData = {
    project_types: projectTypes.map(type => ({
      name: type.name,
      code: type.code,
      description: type.description,
      is_active: type.is_active
    })),
    activities: Object.values(activities).flat().map(activity => ({
      // ... activity fields
    })),
    metadata: {
      exported_at: new Date().toISOString(),
      version: '1.0',
      total_types: projectTypes.length,
      total_activities: Object.values(activities).flat().length
    }
  }
  
  // Download as JSON file
  downloadJSON(templateData, `project-types-template-${date}.json`)
}

// Export specific type
const handleExportSpecificType = async (type: ProjectType) => {
  const typeActivities = activities[type.name] || []
  const templateData = {
    project_type: { /* type data */ },
    activities: typeActivities.map(/* activity data */),
    metadata: { /* metadata */ }
  }
  
  downloadJSON(templateData, `project-type-${type.name}-template-${date}.json`)
}
```

### Import Functions
```typescript
const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  const text = await file.text()
  const templateData = JSON.parse(text)

  // Validate format
  if (!templateData.project_types || !templateData.activities) {
    throw new Error('Invalid template file format')
  }

  // Import project types
  await supabase
    .from('project_types')
    .upsert(templateData.project_types, { onConflict: 'name' })

  // Import activities
  await supabase
    .from('project_type_activities')
    .upsert(templateData.activities, { onConflict: 'project_type,activity_name' })
}
```

## 📁 File Naming Convention

### Export All Template
```
project-types-template-2025-01-20.json
```

### Specific Type Template
```
project-type-infrastructure-template-2025-01-20.json
project-type-residential-template-2025-01-20.json
project-type-commercial-template-2025-01-20.json
```

## 🔄 Import/Export Workflow

### Export Workflow
1. **User clicks "Export Template"**
2. **System prepares data**:
   - Collects all project types
   - Collects all activities
   - Generates metadata
3. **Creates JSON file**
4. **Downloads file** with timestamp
5. **Shows success message**

### Import Workflow
1. **User clicks "Import Template"**
2. **File picker opens**
3. **User selects JSON file**
4. **System validates format**:
   - Checks for required fields
   - Validates JSON structure
5. **Imports data**:
   - Upserts project types
   - Upserts activities
6. **Reloads data**
7. **Shows success message**

## 🛡️ Error Handling

### Validation Errors
```typescript
// Invalid file format
if (!templateData.project_types || !templateData.activities) {
  throw new Error('Invalid template file format')
}

// Missing required fields
if (!templateData.project_types.every(t => t.name)) {
  throw new Error('Project types must have names')
}
```

### Database Errors
```typescript
try {
  await supabase.from('project_types').upsert(data)
} catch (error) {
  setError('Failed to import project types: ' + error.message)
}
```

## 📊 UI Components

### Template Management Card
- **Background**: Gradient (indigo to purple)
- **Icon**: Archive
- **Actions**: Export All, Import Template
- **Info**: Shows template contents count

### Export Buttons
- **Header**: Export Template, Import Template
- **Per Type**: Export button for each project type
- **States**: Loading, disabled, enabled

### File Input
- **Hidden**: Uses hidden file input
- **Accept**: `.json` files only
- **Label**: Styled as button

## 🎯 Use Cases

### 1. Backup & Restore
- **Export**: Create backup of all configurations
- **Import**: Restore from backup
- **Use Case**: System migration, disaster recovery

### 2. Template Sharing
- **Export**: Share configurations with other teams
- **Import**: Use shared templates
- **Use Case**: Standardization across projects

### 3. Environment Setup
- **Export**: Save production configurations
- **Import**: Setup development environment
- **Use Case**: Development, testing, staging

### 4. Version Control
- **Export**: Create version snapshots
- **Import**: Rollback to previous versions
- **Use Case**: Configuration management

## 📈 Benefits

### 1. **Standardization**
- Consistent project types across teams
- Standardized activity templates
- Reduced setup time

### 2. **Backup & Recovery**
- Complete configuration backup
- Easy disaster recovery
- Version control for configurations

### 3. **Collaboration**
- Share templates between teams
- Import best practices
- Knowledge transfer

### 4. **Efficiency**
- Quick setup for new projects
- Reuse proven configurations
- Reduce manual data entry

## 🚀 Future Enhancements

### 1. **Template Library**
- Built-in template library
- Community templates
- Template ratings and reviews

### 2. **Advanced Import Options**
- Merge vs Replace options
- Conflict resolution
- Selective import

### 3. **Template Validation**
- Schema validation
- Data integrity checks
- Compatibility verification

### 4. **Template Versioning**
- Version history
- Change tracking
- Rollback capabilities

## 📚 Technical Implementation

### Files Modified
1. `components/settings/UnifiedProjectTypesManager.tsx` - Main component
2. `TEMPLATE_MANAGEMENT_FEATURE.md` - This documentation

### New Functions Added
- `handleExportTemplate()` - Export all templates
- `handleImportTemplate()` - Import templates
- `handleExportSpecificType()` - Export specific type

### UI Components Added
- Template Management Card
- Export/Import buttons
- File input handling
- Success/Error messages

## ✅ Testing Checklist

### Export Testing
- [ ] Export all templates works
- [ ] Export specific type works
- [ ] File naming is correct
- [ ] JSON format is valid
- [ ] Metadata is included

### Import Testing
- [ ] Valid template imports successfully
- [ ] Invalid template shows error
- [ ] Data is properly upserted
- [ ] UI updates after import
- [ ] Success message shows

### UI Testing
- [ ] Buttons are properly styled
- [ ] Loading states work
- [ ] Error messages display
- [ ] Success messages display
- [ ] File picker works

## 🎉 Conclusion

تم بنجاح إضافة ميزة **Template Management** إلى Project Types & Activities Management. الميزة توفر:

- ✅ **Export All**: تصدير جميع الأنواع والأنشطة
- ✅ **Import Template**: استيراد templates جاهزة  
- ✅ **Export Specific**: تصدير نوع محدد
- ✅ **Error Handling**: معالجة الأخطاء
- ✅ **UI Integration**: تكامل مع الواجهة
- ✅ **File Management**: إدارة الملفات

النظام الآن يدعم إدارة شاملة لـ templates مع واجهة سهلة الاستخدام! 🚀
