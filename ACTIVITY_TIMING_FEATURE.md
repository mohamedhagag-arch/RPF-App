# ⏰ Activity Timing Feature

## 🎯 Feature Description
Added activity timing classification to distinguish between Pre-commencement and Post-commencement activities in the BOQ system.

## ✅ Activity Types

### 1. **Pre-commencement Activities**
- **Definition:** Activities that must be completed before project start
- **Icon:** ⏰ Pre
- **Color:** Orange theme
- **Example:** Site preparation, permits, approvals
- **Logic:** Must finish before project commencement date

### 2. **Post-commencement Activities**
- **Definition:** Activities that start with or after project start
- **Icon:** 🚀 Post
- **Color:** Blue theme
- **Example:** Construction, installation, execution
- **Logic:** Can start with or after project commencement date

## 🔧 Technical Implementation

### Form Field Addition:
```typescript
const [activityTiming, setActivityTiming] = useState<'pre-commencement' | 'post-commencement'>(
  activity?.activity_timing || 'post-commencement'
)
```

### UI Component:
```tsx
{/* Activity Timing */}
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Activity Timing <span className="text-red-500">*</span>
  </label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Pre-commencement Option */}
    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
      activityTiming === 'pre-commencement' 
        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
        : 'border-gray-300 dark:border-gray-600 hover:border-orange-300'
    }`}>
      {/* Radio button and content */}
    </div>
    
    {/* Post-commencement Option */}
    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
      activityTiming === 'post-commencement' 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
    }`}>
      {/* Radio button and content */}
    </div>
  </div>
</div>
```

### Data Storage:
```typescript
const activityData = {
  // ... other fields
  activity_timing: activityTiming,
  // ... rest of fields
}
```

## 📊 BOQ Table Display

### New Column: "Timing"
- **Header:** "Timing"
- **Display:** Badge with icon and description
- **Colors:** Orange for Pre-commencement, Blue for Post-commencement

### Table Cell Implementation:
```tsx
<td className="px-6 py-4 whitespace-nowrap text-sm">
  {activity.activity_timing ? (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
        activity.activity_timing === 'pre-commencement' 
          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' 
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      }`}>
        {activity.activity_timing === 'pre-commencement' ? '⏰ Pre' : '🚀 Post'}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {activity.activity_timing === 'pre-commencement' ? 'Before Start' : 'With Start'}
      </span>
    </div>
  ) : (
    <span className="text-gray-400 dark:text-gray-600">Not set</span>
  )}
</td>
```

## 🎨 UI Features

### 1. **Interactive Selection**
- Radio button style selection
- Visual feedback on hover
- Clear descriptions for each option

### 2. **Warning System**
- Orange warning for Pre-commencement activities
- Reminds users about timing requirements
- Visual alert with icon

### 3. **Color Coding**
- **Orange:** Pre-commencement (urgent/before start)
- **Blue:** Post-commencement (normal/with start)

## 📋 Use Cases

### Pre-commencement Activities:
- **Site Preparation:** Clearing, leveling, access roads
- **Permits & Approvals:** Government permits, environmental clearances
- **Design & Planning:** Final drawings, specifications
- **Procurement:** Material ordering, equipment rental
- **Safety Setup:** Safety systems, emergency procedures

### Post-commencement Activities:
- **Construction:** Building, installation, assembly
- **Execution:** Main project work, operations
- **Implementation:** Following project timeline
- **Production:** Manufacturing, processing
- **Delivery:** Final deliverables, handover

## 🚀 Benefits

1. **Better Project Planning** - Clear distinction between preparation and execution
2. **Timeline Management** - Pre-commencement activities have strict deadlines
3. **Resource Allocation** - Different resource needs for different phases
4. **Risk Management** - Pre-commencement delays affect entire project
5. **Progress Tracking** - Clear milestones and dependencies

## 📊 Example Scenarios

### Scenario 1: Construction Project
- **Pre-commencement:** Site survey, permits, material procurement
- **Post-commencement:** Foundation, structure, finishing

### Scenario 2: Software Project
- **Pre-commencement:** Requirements gathering, design, setup
- **Post-commencement:** Development, testing, deployment

### Scenario 3: Manufacturing Project
- **Pre-commencement:** Equipment setup, training, quality systems
- **Post-commencement:** Production, quality control, delivery

## 🔍 Validation Logic

### Pre-commencement Validation:
- End date must be before project start date
- Warning if dates don't align
- Visual indicators for timing requirements

### Post-commencement Validation:
- Can start with or after project start
- Normal timeline validation
- Standard project flow

## 📈 Future Enhancements

1. **Dependency Tracking** - Link pre-commencement to post-commencement
2. **Critical Path Analysis** - Identify critical pre-commencement activities
3. **Resource Planning** - Different resource allocation strategies
4. **Risk Assessment** - Higher risk for pre-commencement delays
5. **Reporting** - Separate reports for different activity types

---

**Status:** ✅ Implemented  
**Files Modified:** 
- `components/boq/IntelligentBOQForm.tsx`
- `components/boq/BOQTable.tsx`  
**Last Updated:** October 16, 2025
