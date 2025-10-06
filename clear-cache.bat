@echo off
echo Clearing Next.js cache...

REM Stop any running dev server
taskkill /F /IM node.exe 2>nul

REM Delete .next folder
if exist .next rmdir /s /q .next
echo .next folder cleared

REM Delete node_modules/.cache
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo node_modules cache cleared

REM Optional: Clear npm cache
echo Clearing npm cache...
npm cache clean --force

echo Cache cleared successfully!
echo.
echo Starting dev server...
npm run dev


