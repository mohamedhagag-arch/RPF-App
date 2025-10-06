# 🎯 Intelligent Forms Documentation

This document describes the smart features of the intelligent forms in the Rabat MVP application.

## ✨ Intelligent Project Form

### Features

#### 1. **Smart Project Code Generation**
- Auto-suggests the next available project code based on your previous projects
- Validates project code format in real-time
- Example: If your last project was `P5074`, it suggests `P5075`

#### 2. **Auto Sub-Code Generation**
- Automatically generates project sub-code from the main project code
- Format: `[PROJECT_CODE]-01`, `[PROJECT_CODE]-02`, etc.
- Example: `P5074` → `P5074-01`
- Can be disabled for manual entry

#### 3. **Intelligent Division & Type Suggestions**
- **Division Dropdown**: Select from existing divisions or add new ones
- **Smart Type Suggestions**: Based on the selected division
  - Example: Civil Division → suggests Infrastructure, Roads, Bridge projects
  - Example: Electrical Division → suggests Electrical Network, Smart City
- Custom divisions and types are saved for future use

#### 4. **Project Insights & Estimates**
When you select a project type, you get:
- **Typical Duration**: Estimated project duration in months
- **Typical Budget**: Average contract amount for this type of project
- **Budget Range**: Min and max typical contract values

Examples:
- Infrastructure: ~24 months, AED 100M (range: 50M - 500M)
- Roads & Transportation: ~12 months, AED 25M (range: 10M - 100M)
- Landscaping: ~6 months, AED 2M (range: 0.5M - 5M)

#### 5. **Quick Fill Features**
- **Typical Budget Button**: Click to fill in the typical contract amount for the selected project type
- Saves time and provides realistic estimates

#### 6. **Custom Data Management**
- All custom divisions and project types are saved in your browser's localStorage
- Automatically reused in future project creation
- Can be exported/imported for backup

#### 7. **Real-time Validation**
- ✅ Valid project code indicator
- ⚠️ Invalid format warnings
- Required field indicators
- Smart error messages

### How to Use

1. **Open the form**: Click "Add New Project" in the Projects page
2. **Enter Project Code**: Type or use the suggested code
3. **Project Name**: Enter the full project name
4. **Select Division**: Choose from the dropdown or type a new one
5. **Select Project Type**: Choose a suggested type or add custom
6. **Review Insights**: Check the estimated duration and budget
7. **Fill Additional Info**: Plot number, contract amount, status
8. **Submit**: Click "Create Project"

---

## 🎨 Intelligent BOQ Form

### Features

#### 1. **Project Auto-Load**
- Select project from dropdown
- Automatically loads project name, division, and other details
- Shows project information card with badges

#### 2. **Smart Activity Suggestions**
- Dropdown with activities relevant to the project's division
- Example: Civil Division → Earthwork, Concrete Works, Steel Fixing
- Can add custom activities that are saved for future use

#### 3. **Auto Unit Suggestions**
- Automatically suggests the most common unit for the selected activity
- Example: "Concrete Pouring" → suggests "Cu.M"
- Dropdown with all common units (Running Meter, Sq.M, Cu.M, No., etc.)

#### 4. **Smart Duration Calculation**
- Automatically calculates working days between start and end dates
- **Excludes Sundays** (UAE weekend)
- **Excludes Public Holidays** (UAE national holidays pre-configured)
- Can enable "Compressed Project" mode to include weekends

#### 5. **KPI Auto-Generation**
When you fill Planned Units and dates:
- Automatically generates daily KPI records
- Distributes quantity evenly across working days
- **Exact quantity matching**: Total KPI quantity = Planned Units (exactly)
- **Whole numbers only**: Individual daily quantities are integers
- Smart rounding algorithm ensures accuracy

#### 6. **KPI Preview**
Before creating:
- Shows number of KPI records that will be created
- Displays total quantity, average per day, and working days
- **View Details button**: Shows full table of all daily KPIs
- Preview includes dates, days of week, quantities, and status

#### 7. **Compressed Project Mode**
For urgent projects working 7 days/week:
- Enable checkbox to include Sundays
- Recalculates duration and KPI distribution
- Weekend days are highlighted in preview

#### 8. **Custom Activity Learning**
- New activities you add are automatically saved
- Appear in suggestions for future BOQ entries
- Tracked by division for better suggestions

### How to Use

1. **Open the form**: Click "Add New Activity" in BOQ page
2. **Select Project**: Choose from the dropdown
3. **Activity Name**: Type or select from suggestions
4. **Unit**: Auto-filled or select from dropdown
5. **Planned Units**: Enter quantity (can be 0 to update later)
6. **Dates**: Select start and end dates
7. **Duration**: Auto-calculated based on working days
8. **Enable Auto-KPI**: Check to generate KPI records
9. **Preview KPIs**: Click "View Details" to see the table
10. **Submit**: Click "Create Activity" (+ KPIs if enabled)

---

## 🔧 Settings & Customization

### Custom Holidays
Go to **Settings → Holidays & Workdays** to:
- Add custom holidays (one-time or recurring)
- Delete holidays
- Export/import holiday lists

### Custom Activities
Go to **Settings → Custom Activities** to:
- View all custom activities you've added
- See usage count for each activity
- Delete unused activities
- Export/import custom activity lists

### Custom Project Data
- All custom divisions and project types are saved automatically
- Access via browser's localStorage
- Can be cleared from browser settings if needed

---

## 💡 Tips & Best Practices

### For Projects:
1. Use consistent project code format across your organization
2. Let the auto sub-code feature work - it ensures consistency
3. Review the typical budget and duration estimates before finalizing
4. Add custom divisions that are specific to your organization

### For BOQ Activities:
1. Always review the KPI preview before creating
2. Use "Compressed Project" mode only when truly needed
3. Start with 0 Planned Units if you're not sure yet - you can update later
4. Custom activities will appear in suggestions - name them clearly

### For KPIs:
1. The auto-generated KPIs are "Planned" status
2. Update actual progress in the KPI Tracking page
3. Total quantity will always match Planned Units exactly
4. Individual daily quantities are rounded to whole numbers

---

## 🎨 Design Features

Both forms include:
- Modern gradient design with animations
- Dark mode support
- Mobile responsive layout
- Loading states and progress indicators
- Success and error messages
- Keyboard shortcuts (Enter to submit, Esc to cancel)
- Auto-save for custom data
- Smart validation with helpful messages

---

## 🚀 Performance

- **Lazy Loading**: Only loads data when needed
- **Local Storage**: Custom data cached for instant access
- **Smart Caching**: Frequently used suggestions loaded first
- **Optimized Rendering**: Uses React best practices for smooth UI

---

## 📞 Support

If you encounter any issues or have suggestions for improvements, please contact the development team.

**Version**: 1.0.0  
**Last Updated**: October 2, 2025


