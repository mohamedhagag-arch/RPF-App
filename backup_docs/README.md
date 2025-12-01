# AlRabat RPF - Masters of Foundation Construction

🚀 **Live Demo**: [https://alrabat-rpf.vercel.app](https://alrabat-rpf.vercel.app)

**Masters of Foundation Construction** - Advanced project management system using Next.js and Supabase for managing projects, activities, and key performance indicators with real-time progress tracking and comprehensive reporting.

## 🚀 Features

### 📊 **Smart BOQ Management**
- Advanced Bill of Quantities management
- Real-time progress tracking
- Automated calculations and reporting
- Smart form validation and auto-fill

### 📈 **KPI Tracking & Analytics**
- Comprehensive KPI management
- Real-time analytics and reporting
- Smart KPI forms with global date selection
- Batch submission and preview functionality
- Enhanced start date calculation from planned KPIs

### 🏗️ **Project Management System**
- Complete project lifecycle management
- Activity timeline with smart date calculation
- KPI day order display
- Project analytics and reporting
- Advanced sorting and filtering

### 👥 **User Management & Permissions**
- Role-based access control (Admin, Manager, Engineer, Viewer)
- 54 granular permissions across 8 categories
- User synchronization and management
- Department and job title management

### 📤 **Export/Import Functionality**
- Export/Import for Departments, Job Titles, Divisions, and Currencies
- Multiple formats (JSON, CSV, Excel)
- Bulk operations and data integration
- Data validation and error handling

### 🎯 **Enhanced Activity Management**
- Activity timeline with start/end dates and duration
- Smart start date calculation from first planned KPI
- KPI activity date and day order display
- Multiple matching strategies for data integration

## 🛠️ **Technology Stack**

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Deployment**: Vercel

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm 8+
- Supabase account

### **Installation**
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/alrabat-rpf.git

# Navigate to project directory
cd alrabat-rpf

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### **Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SITE_URL=https://alrabat-rpf.vercel.app
```

## 📊 **Database Schema**

The system uses PostgreSQL with the following main tables:
- `users` - User management and roles
- `projects` - Project information
- `boq_activities` - Bill of Quantities activities
- `kpi_records` - Key Performance Indicators
- `departments` - Department management
- `job_titles` - Job title management
- `divisions` - Division management
- `currencies` - Currency management

## 🔐 **Security**

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Granular permission system
- Secure authentication with Supabase Auth
- Data validation and sanitization

## 📈 **Performance**

- Optimized database queries
- Lazy loading and pagination
- Efficient state management
- Smart caching strategies
- Performance monitoring and analytics

## 🚀 **Deployment**

The application is deployed on Vercel with automatic deployments from the main branch.

### **Production URL**
https://alrabat-rpf.vercel.app

### **Deployment Commands**
```bash
# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📝 **Recent Updates**

### **Version 3.0.14 (December 2024)**
- Enhanced Start Date Calculation with Multiple Matching Strategies
- Activity Timeline Display with Smart Date Calculation
- KPI Activity Date and Day Order Display
- Multiple Fallback System for Start Date
- Comprehensive Logging for Debugging
- Smart Date Sorting and Validation

### **Version 3.0.13 (December 2024)**
- Export/Import functionality for Departments, Job Titles, Divisions, and Currencies
- Bulk operations and data integration
- Enhanced user management and permissions
- Improved UI/UX for data management

### **Version 3.0.12 (December 2024)**
- Smart KPI Form with global date selection
- Batch submission and preview functionality
- Submit protection and success messages
- Enhanced form validation and user experience

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is proprietary software developed for AlRabat RPF.

## 📞 **Support**

For support and questions, please contact the development team.

---

**Developed by:** AlRabat RPF Development Team  
**Version:** 3.0.14  
**Last Updated:** December 2024