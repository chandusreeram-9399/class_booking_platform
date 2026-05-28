#!/bin/bash

# Global Class Offering Booking System - Setup Script
# This script helps set up the project for development

set -e

echo "================================"
echo "Class Booking System Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Install with: npm install -g pnpm"
    exit 1
fi
echo "✓ pnpm $(pnpm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Check for .env.local
echo ""
if [ -f .env.local ]; then
    echo "✓ .env.local already exists"
else
    echo "📝 Creating .env.local from template..."
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo "✓ Created .env.local - please update with your DATABASE_URL"
        echo ""
        echo "  For Neon:"
        echo "  DATABASE_URL='postgresql://[user]:[password]@[project].neon.tech/[db]?sslmode=require'"
        echo ""
        read -p "Press Enter after updating .env.local..."
    fi
fi

# Check DATABASE_URL
echo ""
if grep -q "DATABASE_URL=" .env.local; then
    echo "✓ .env.local has DATABASE_URL configured"
else
    echo "❌ DATABASE_URL not found in .env.local"
    echo "Please add your database connection string to .env.local"
    exit 1
fi

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npx drizzle-kit generate
npx drizzle-kit migrate

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Start development server: pnpm dev"
echo "2. API available at: http://localhost:3000/api"
echo "3. Test with Postman collection: POSTMAN_COLLECTION.json"
echo "4. Read QUICK_START.md for example requests"
echo ""
