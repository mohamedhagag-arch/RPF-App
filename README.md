# RPF Application - Clean Project

## Overview
This is a clean, organized version of the RPF (Request for Proposal) application. The project has been cleaned up by removing excessive documentation files, debug files, and unnecessary clutter while preserving all essential functionality.

## Project Structure

### Core Application
- **`app/`** - Next.js 14 App Router structure
  - `(authenticated)/` - Protected routes requiring authentication
  - `dashboard/` - Main dashboard interface
  - `projects/` - Project management
  - `kpi/` - KPI tracking and management
  - `boq/` - Bill of Quantities management
  - `settings/` - System settings and configuration
  - `reports/` - Reporting functionality

### Components
- **`components/`** - React components organized by feature
  - `auth/` - Authentication components
  - `dashboard/` - Dashboard-related components
  - `kpi/` - KPI management components
  - `projects/` - Project management components
  - `settings/` - Settings and configuration components
  - `ui/` - Reusable UI components

### Database & Scripts
- **`Database/`** - Database schema and migration files
- **`scripts/`** - Utility scripts for data management
- **`lib/`** - Utility functions and database connections

### Configuration
- **`package.json`** - Project dependencies and scripts
- **`next.config.js`** - Next.js configuration
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`tsconfig.json`** - TypeScript configuration

## Key Features

### 1. Project Management
- Create and manage construction projects
- Track project progress and status
- Project type categorization
- Activity management

### 2. KPI Tracking
- Record and track Key Performance Indicators
- Smart form generation
- Progress monitoring
- Data visualization

### 3. BOQ Management
- Bill of Quantities management
- Activity tracking
- Progress calculation
- Status monitoring

### 4. User Management
- Role-based access control
- Permission management
- User profile management
- Authentication system

### 5. Reporting
- Generate project reports
- Export data in various formats
- Analytics and insights
- Performance tracking

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: Custom component library
- **Charts**: Recharts
- **Forms**: React Hook Form

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rpf-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `env.example` to `.env.local`
   - Configure your Supabase credentials
   - Set up database connection

4. **Database Setup**
   - Run database migration scripts from `Database/` folder
   - Import initial data using scripts in `scripts/` folder

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Project Cleanup Summary

The following cleanup actions were performed:

### Removed Files
- **399+ documentation files** - Excessive .md files removed
- **Debug files** - All debug-*.js files removed
- **Test files** - Test-*.js and test-*.html files removed
- **SQL files** - Standalone .sql files removed
- **Batch files** - .bat files removed
- **Temporary files** - Build cache and temporary files removed

### Preserved Files
- **Essential documentation** - README.md, LICENSE
- **Core application code** - All React components and pages
- **Database files** - Essential database schema and migrations
- **Configuration files** - All necessary config files
- **Scripts** - Utility scripts for data management
- **Examples** - Template examples for data import

### Backup
- **backup_docs/** - Contains backed up essential documentation files

## Development Guidelines

### Code Organization
- Components are organized by feature in the `components/` directory
- Each feature has its own subdirectory
- Shared components are in `components/ui/`
- Database utilities are in `lib/`

### Naming Conventions
- Components use PascalCase
- Files use kebab-case for directories
- Database tables use snake_case

### Best Practices
- Use TypeScript for type safety
- Follow React best practices
- Implement proper error handling
- Use Tailwind CSS for styling
- Follow Next.js App Router patterns

## Support

For issues and questions:
1. Check the project documentation
2. Review the code structure
3. Check database connections
4. Verify environment configuration

## License

This project is licensed under the terms specified in the LICENSE file.