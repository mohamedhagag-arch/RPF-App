#!/bin/bash

echo "🚀 Rabat MVP - Data Import"
echo "=========================="
echo

# Check if .env.local exists
if [ ! -f "../.env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local file with your Supabase credentials"
    exit 1
fi

# Check if CSV files exist
if [ ! -f "../Database/Planning Database - ProjectsList.csv" ]; then
    echo "❌ ProjectsList.csv not found!"
    exit 1
fi

if [ ! -f "../Database/Planning Database - BOQ Rates .csv" ]; then
    echo "❌ BOQ Rates .csv not found!"
    exit 1
fi

if [ ! -f "../Database/Planning Database - KPI.csv" ]; then
    echo "❌ KPI.csv not found!"
    exit 1
fi

echo "✅ All files found"
echo "📊 Starting data import..."
echo

node quick-import.js

echo
echo "Press Enter to exit..."
read
