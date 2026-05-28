# 🚀 START HERE - Global Class Booking System

Welcome! This guide will get you up and running in **5 minutes**.

## What You Have

A complete backend API for a class booking platform with:
- ✅ 10 API endpoints
- ✅ 6 database tables
- ✅ Timezone support
- ✅ Conflict detection
- ✅ Complete documentation

## The 3-Step Setup

### Step 1: Get Your Database (2 min)

**Option A: Use Neon (Recommended - Free & Serverless)**
1. Go to https://neon.tech (free account)
2. Create a new project
3. Copy the connection string

**Option B: Use Local PostgreSQL**
1. Install PostgreSQL
2. Create a database: `createdb class_booking_db`
3. Connection: `postgresql://postgres:password@localhost:5432/class_booking_db`

### Step 2: Configure Project (1 min)

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and paste your connection string
# Windows: open .env.local in Notepad or VSCode
# Mac/Linux: nano .env.local
```

**Your .env.local should look like:**
```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### Step 3: Setup & Run (2 min)

**Option A: Automatic (Recommended)**

On Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

On Windows:
```bash
setup.bat
```

**Option B: Manual**
```bash
pnpm install
npx drizzle-kit generate
npx drizzle-kit migrate
pnpm dev
```

## ✅ You're Done!

Your API is running at: **http://localhost:3000/api**

## What's Next?

### 1. Test the API (Pick One)

**A. Using Postman (Easiest)**
1. Open Postman: https://www.postman.com/
2. Import `POSTMAN_COLLECTION.json` file
3. Click through the requests to test

**B. Using curl (Terminal)**
```bash
# Create a teacher
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "name": "John",
    "role": "teacher",
    "timezone": "America/New_York"
  }'
```

### 2. Create Your Demo

Follow examples in `QUICK_START.md` to create test data and show:
- Teacher creating course & offering
- Parent browsing offerings
- Parent booking offering
- Timezone conversion
- Conflict detection (try double-booking)

### 3. Make a Video

Record yourself:
1. Running the API (`pnpm dev`)
2. Testing endpoints with curl or Postman
3. Showing booking workflow
4. Demonstrating timezone handling

## 📚 Documentation Guide

| File | Purpose |
|------|---------|
| **QUICK_START.md** | 5-min API examples with curl/Postman |
| **README.md** | Complete API reference & examples |
| **SETUP.md** | Detailed setup instructions |
| **MIGRATION_SETUP.md** | Database migration guide |
| **ARCHITECTURE.md** | System design & concurrency |
| **POSTMAN_COLLECTION.json** | Ready-to-import Postman tests |
| **openapi.yaml** | OpenAPI/Swagger specification |

## Common Issues & Fixes

### "drizzle.config.json not found"
✓ The file exists in project root. Make sure you copied the entire project.

### "Cannot connect to database"
- Check DATABASE_URL in .env.local
- For Neon: URL must end with `?sslmode=require`
- For local: Make sure PostgreSQL is running

### "Port 3000 already in use"
```bash
PORT=3001 pnpm dev
```

### "Module not found" errors
```bash
pnpm install
```

## File Structure

```
project/
├── app/api/              # API routes (10 endpoints)
├── db/                   # Database config
│   ├── schema.ts        # 6 tables definition
│   └── index.ts         # Connection setup
├── lib/
│   ├── services/        # Business logic
│   ├── timezone.ts      # Timezone utilities
│   └── api-response.ts  # Error handling
├── drizzle/             # Migrations (auto-generated)
├── .env.example         # Environment template
├── drizzle.config.json  # Drizzle config
├── setup.sh/bat         # Setup scripts
└── [8 documentation files]
```

## Ready to Submit?

Before submission, ensure:
- ✅ .env.local has DATABASE_URL set
- ✅ `pnpm install` completes without errors
- ✅ `npx drizzle-kit migrate` completes successfully
- ✅ `pnpm dev` starts server on port 3000
- ✅ API responds to requests (test with curl)
- ✅ Demo video shows all features working

## Quick Command Reference

```bash
# Install everything
pnpm install

# Setup database
npx drizzle-kit generate
npx drizzle-kit migrate

# Start development server
pnpm dev

# Stop server
Ctrl+C

# Test API
curl http://localhost:3000/api/users

# View migrations
cat drizzle/*.sql

# Reset database (careful!)
npx drizzle-kit drop
npx drizzle-kit migrate
```

## Need More Help?

1. **Setup Issues** → Read MIGRATION_SETUP.md
2. **API Questions** → Read README.md
3. **Architecture Details** → Read ARCHITECTURE.md
4. **API Examples** → Read QUICK_START.md or POSTMAN_COLLECTION.json
5. **System Design** → Read ARCHITECTURE.md

---

**Questions?** Check the relevant documentation file above.

**All set?** Follow "What's Next?" section to test and create your demo!

Good luck! 🎉
