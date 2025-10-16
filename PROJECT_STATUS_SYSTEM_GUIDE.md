# 🎯 Project Status System Guide

## 🎯 Overview
Automatic project status calculation and tracking system that intelligently determines project status based on activities, KPIs, and project timeline.

## 📊 Project Status Types

### 1. **Upcoming** ⏳
- **Definition:** Project has not started yet
- **Trigger:** Current date < project start date
- **Color:** Gray
- **Description:** Project is scheduled but not yet commenced

### 2. **Site Preparation** 🏗️
- **Definition:** Project started but in pre-commencement phase
- **Trigger:** Project started + pre-commencement activities < 100% complete
- **Color:** Orange
- **Description:** Pre-commencement activities in progress

### 3. **On Going** 🚀
- **Definition:** Post-commencement activities in progress
- **Trigger:** Pre-commencement complete + post-commencement activities < 100%
- **Color:** Blue
- **Description:** Main project execution phase

### 4. **Completed** ✅
- **Definition:** All planned quantities achieved
- **Trigger:** Actual quantities ≥ planned quantities
- **Color:** Green
- **Description:** All planned quantities achieved

### 5. **Completed Duration** ⏰
- **Definition:** Project duration ended with high completion
- **Trigger:** Project end date reached + quantities ≥ 95%
- **Color:** Purple
- **Description:** Project duration completed

### 6. **Contract Duration** 📋
- **Definition:** All contract activities completed
- **Trigger:** All activities status = completed
- **Color:** Emerald
- **Description:** All contract activities completed

### 7. **On Hold** ⏸️
- **Definition:** Project temporarily suspended
- **Trigger:** Manual status or activities on hold
- **Color:** Yellow
- **Description:** Project is temporarily suspended

### 8. **Cancelled** ❌
- **Definition:** Project has been cancelled
- **Trigger:** Manual status or activities cancelled
- **Color:** Red
- **Description:** Project has been cancelled

## 🔧 Technical Implementation

### Core Files:
- `lib/projectStatusCalculator.ts` - Status calculation logic
- `lib/projectStatusUpdater.ts` - Automatic status updates
- `components/projects/ProjectStatusDisplay.tsx` - UI display
- `Database/project_status_fields.sql` - Database schema

### Database Schema:
```sql
-- Projects table additions
ALTER TABLE projects 
ADD COLUMN project_status TEXT DEFAULT 'upcoming',
ADD COLUMN status_confidence DECIMAL(5,2) DEFAULT 0,
ADD COLUMN status_reason TEXT,
ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE;

-- Activities table additions
ALTER TABLE boq_activities 
ADD COLUMN activity_timing TEXT DEFAULT 'post-commencement',
ADD COLUMN status TEXT DEFAULT 'not_started';
```

## 🚀 Usage Examples

### 1. **Calculate Project Status**
```typescript
import { calculateProjectStatus } from '@/lib/projectStatusCalculator'

const statusData = {
  project_id: 'proj-123',
  project_code: 'PROJ-001',
  project_name: 'Sample Project',
  project_start_date: '2024-01-01',
  project_end_date: '2024-12-31',
  current_date: '2024-06-15',
  activities: [...],
  kpis: [...]
}

const result = calculateProjectStatus(statusData)
console.log(result.status) // 'on-going'
console.log(result.confidence) // 85
console.log(result.reason) // 'Post-commencement activities in progress (75.2%)'
```

### 2. **Update Single Project Status**
```typescript
import { updateProjectStatus } from '@/lib/projectStatusUpdater'

const update = await updateProjectStatus('proj-123')
if (update) {
  console.log(`Status changed: ${update.old_status} → ${update.new_status}`)
}
```

### 3. **Update All Project Statuses**
```typescript
import { updateAllProjectStatuses } from '@/lib/projectStatusUpdater'

const updates = await updateAllProjectStatuses()
console.log(`Updated ${updates.length} projects`)
```

### 4. **Display Project Status**
```tsx
import { ProjectStatusDisplay } from '@/components/projects/ProjectStatusDisplay'

<ProjectStatusDisplay 
  projectId="proj-123"
  showSummary={true}
  showControls={true}
  onStatusUpdate={(updates) => console.log('Status updated:', updates)}
/>
```

## 📊 Status Calculation Logic

### Phase 1: Pre-commencement
- **Activities:** Pre-commencement activities only
- **Progress:** Based on actual vs planned units
- **Status:** Site Preparation

### Phase 2: Post-commencement
- **Activities:** Post-commencement activities
- **Progress:** Based on actual vs planned units + KPIs
- **Status:** On Going

### Phase 3: Completion
- **Quantity Check:** Actual ≥ Planned
- **Duration Check:** Project end date reached
- **Contract Check:** All activities completed
- **Status:** Completed, Completed Duration, or Contract Duration

## 🎨 UI Features

### Status Display:
- **Color-coded badges** for each status
- **Icons** for visual recognition
- **Confidence levels** for status accuracy
- **Reason explanations** for status decisions

### Controls:
- **Manual update** for single projects
- **Bulk update** for all projects
- **Scheduled updates** for automation
- **Real-time monitoring** of status changes

## 🔄 Automation Features

### 1. **Automatic Updates**
```typescript
import { scheduleStatusUpdates } from '@/lib/projectStatusUpdater'

// Update every hour
const intervalId = scheduleStatusUpdates(60)
```

### 2. **Database Triggers**
- Automatic status updates when activities change
- Automatic status updates when KPIs change
- Timestamp tracking for status changes

### 3. **Real-time Monitoring**
- Status change notifications
- Progress tracking
- Performance metrics

## 📈 Status Transitions

### Valid Transitions:
```
upcoming → site-preparation → on-going → completed → completed-duration → contract-duration
    ↓           ↓              ↓
on-hold ← site-preparation ← on-going
    ↓
cancelled
```

### Invalid Transitions:
- `completed` → `site-preparation` (backward)
- `cancelled` → any status (final state)
- `contract-duration` → any status (final state)

## 🎯 Business Logic

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

## 🔍 Monitoring & Analytics

### Status Summary:
- **Total projects** by status
- **Percentage distribution** of statuses
- **Recent status changes** with timestamps
- **Confidence levels** for status accuracy

### Performance Metrics:
- **Status update frequency**
- **Status change patterns**
- **Project completion rates**
- **Timeline adherence**

## 🚀 Future Enhancements

### 1. **Advanced Analytics**
- Status trend analysis
- Predictive status modeling
- Risk assessment based on status
- Performance benchmarking

### 2. **Integration Features**
- External system status sync
- Notification systems
- Reporting dashboards
- Mobile app integration

### 3. **Customization**
- Custom status definitions
- Project-specific status rules
- User-defined status transitions
- Custom status displays

---

**Status:** ✅ Implemented  
**Files Created:** 
- `lib/projectStatusCalculator.ts`
- `lib/projectStatusUpdater.ts`
- `components/projects/ProjectStatusDisplay.tsx`
- `Database/project_status_fields.sql`
**Last Updated:** October 16, 2025
