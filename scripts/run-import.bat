@echo off
echo 🚀 Rabat MVP - Data Import
echo ==========================
echo.

REM Check if .env.local exists
if not exist "..\.env.local" (
    echo ❌ .env.local file not found!
    echo Please create .env.local file with your Supabase credentials
    pause
    exit /b 1
)

REM Check if CSV files exist
if not exist "..\Database\Planning Database - ProjectsList.csv" (
    echo ❌ ProjectsList.csv not found!
    pause
    exit /b 1
)

if not exist "..\Database\Planning Database - BOQ Rates .csv" (
    echo ❌ BOQ Rates .csv not found!
    pause
    exit /b 1
)

if not exist "..\Database\Planning Database - KPI.csv" (
    echo ❌ KPI.csv not found!
    pause
    exit /b 1
)

echo ✅ All files found
echo 📊 Starting data import...
echo.

node quick-import.js

echo.
echo Press any key to exit...
pause > nul
