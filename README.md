# Rabat MVP - Project Management System

Advanced project management system using Next.js and Supabase for managing projects, activities, and key performance indicators with real-time progress tracking and comprehensive reporting.

## ⭐ Latest Updates (v1.0.0)

- 🆕 **Planning Schema Integration** - Direct connection to real planning data
- 🆕 **Auto Progress Calculation** - Automatic calculation based on Planned vs Actual values
- 🆕 **Advanced Reporting System** - Daily, Weekly, Monthly, and Lookahead reports
- 🆕 **Critical Path Analysis** - Identify activities requiring immediate attention

## Features

- 🔐 **Advanced Authentication System** with different permission levels
- 📊 **Project Management** - Add, edit, and delete projects from Planning Database
- 📋 **Bill of Quantities (BOQ) Management** - Track activities with auto-calculated progress
- 📈 **Key Performance Indicators (KPI) Tracking** - Monitor performance with timestamps
- 📅 **Advanced Reporting** - Daily, Weekly, Monthly reports with Lookahead planning
- 🎯 **Auto Progress Calculation** - Progress % = (Actual / Planned) × 100
- 🎨 **English User Interface** with responsive design
- 📱 **Responsive Design** that works on all devices

## Technologies Used

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## System Requirements

- Node.js 18+ 
- npm or yarn
- Supabase account

## Installation and Setup

### 1. Clone the Project

```bash
git clone <repository-url>
cd rabat-mvp
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Setup Supabase

1. Create a new project in [Supabase](https://supabase.com)
2. Copy the URL and API Key from project settings
3. Create a `.env.local` file in the root folder:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Setup Database

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the content from `lib/database-schema.sql` file and paste it in the editor
4. Click "Run" to create tables and policies

### 5. Run the Project

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
rabat-mvp/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Main layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Context providers
├── components/            # Components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard
│   ├── projects/         # Project management
│   ├── boq/              # BOQ management
│   ├── kpi/              # KPI tracking
│   └── ui/               # UI components
├── lib/                  # Libraries and configurations
│   ├── supabase.ts       # Supabase configuration
│   └── database-schema.sql # Database schema
└── public/               # Static files
```

## Permission Levels

- **Admin**: Full permissions (user management, data deletion)
- **Manager**: Project and activity management
- **Engineer**: Add and edit activities and KPIs
- **Viewer**: View data only

## Usage

### 1. Login
- Use existing accounts (admin@rabat.com, manager@rabat.com, engineer@rabat.com)
- Or create new account

### 2. Project Management
- Go to "Projects"
- View all projects from Planning Database
- Projects are automatically synced with Planning Schema

### 3. Activity Management (BOQ)
- Go to "BOQ Activities"
- Add or edit activities
- Enter **Planned Quantity** (from planning phase)
- Enter **Actual Quantity** (from site engineer)
- **Progress % is calculated automatically!** ✨
  - Formula: (Actual / Planned) × 100
  - Status updated automatically (Completed, On Track, Delayed)

### 4. KPI Tracking
- Go to "KPI Tracking"
- Track planned vs actual values with timestamps
- Monitor performance indicators

### 5. Advanced Reports (New!)
- Go to "Advanced Reports" in sidebar
- Choose report type:
  - **Daily** - Today's activities and progress
  - **Weekly** - This week's summary
  - **Monthly** - Month performance
  - **Lookahead** - Current week + Next week planning
  - **Summary** - Complete project overview
- Export reports as needed

## Data Import

You can import data from CSV files located in the `Database` folder:

1. **ProjectsList**: Project data
2. **BOQ Rates**: Activity and quantity data
3. **KPI**: KPI data

## Support and Help

For help or to report issues:

1. Check the `lib/database-schema.sql` file to ensure database setup is correct
2. Verify environment variables in `.env.local` are correct
3. Check browser console for errors

## Development

### Adding New Features

1. Create components in the appropriate folder
2. Add required tables to the database
3. Update RLS policies as needed
4. Add tests

### Building for Production

```bash
npm run build
npm start
```

## License

This project is licensed under the MIT License.
