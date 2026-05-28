@echo off
REM Global Class Offering Booking System - Setup Script (Windows)

echo ================================
echo Class Booking System Setup
echo ================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo X pnpm is not installed. Install with: npm install -g pnpm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
echo [OK] pnpm %PNPM_VERSION%

REM Install dependencies
echo.
echo [*] Installing dependencies...
call pnpm install

REM Check for .env.local
echo.
if exist .env.local (
    echo [OK] .env.local already exists
) else (
    echo [*] Creating .env.local from template...
    if exist .env.example (
        copy .env.example .env.local
        echo [OK] Created .env.local - please update with your DATABASE_URL
        echo.
        echo   For Neon:
        echo   DATABASE_URL=postgresql://[user]:[password]@[project].neon.tech/[db]?sslmode=require
        echo.
        pause
    )
)

REM Check DATABASE_URL
echo.
findstr /M "DATABASE_URL=" .env.local >nul
if %errorlevel% equ 0 (
    echo [OK] .env.local has DATABASE_URL configured
) else (
    echo X DATABASE_URL not found in .env.local
    echo Please add your database connection string to .env.local
    pause
    exit /b 1
)

REM Run migrations
echo.
echo [*] Running database migrations...
call npx drizzle-kit generate
call npx drizzle-kit migrate

echo.
echo ================================
echo [OK] Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Start development server: pnpm dev
echo 2. API available at: http://localhost:3000/api
echo 3. Test with Postman collection: POSTMAN_COLLECTION.json
echo 4. Read QUICK_START.md for example requests
echo.
pause
