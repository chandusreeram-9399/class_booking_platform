# Database Migration Setup Guide

## The Error You Saw

```
No config path provided, using default 'drizzle.config.json'
drizzle.config.json file does not exist
```

This error means Drizzle couldn't find the configuration file. **The solution is simple** - the `drizzle.config.json` file is now included in the project root.

## Quick Fix

### Option 1: Using the Setup Script (Recommended)

**On Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**On Windows:**
```bash
setup.bat
```

The script handles everything automatically.

### Option 2: Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file (or create .env.local manually)
cp .env.example .env.local

# 3. Edit .env.local with your Neon connection string
# For Neon: postgresql://[username]:[password]@[project-id].neon.tech/[database-name]?sslmode=require

# 4. Generate migrations
npx drizzle-kit generate

# 5. Run migrations
npx drizzle-kit migrate

# 6. Start dev server
pnpm dev
```

## What the drizzle.config.json Does

The `drizzle.config.json` file tells Drizzle where to find:
- **schema**: The database schema definition (`./db/schema.ts`)
- **out**: Where to output migrations (`./drizzle`)
- **driver**: PostgreSQL (`pg`)
- **dbCredentials**: Uses your `DATABASE_URL` environment variable

```json
{
  "schema": "./db/schema.ts",
  "out": "./drizzle",
  "driver": "pg",
  "dbCredentials": {
    "connectionString": "$DATABASE_URL"
  }
}
```

## Step-by-Step Setup with Neon

### 1. Create Neon Project
1. Go to https://neon.tech and sign up
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:password@project-id.neon.tech/dbname?sslmode=require`)

### 2. Configure Your Local Environment

**Create `.env.local` in project root:**
```bash
DATABASE_URL="postgresql://[your-username]:[your-password]@[your-project-id].neon.tech/[your-database-name]?sslmode=require"
```

### 3. Run Migrations

```bash
# Generate migrations from schema
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate
```

This will:
1. Create all 6 tables in your database
2. Set up all indexes and constraints
3. Create the relationships between tables

### 4. Verify Setup

```bash
# Start dev server
pnpm dev

# Test API (in another terminal)
curl http://localhost:3000/api/users
# Should return: {"error":"No content-type header"}
```

## Troubleshooting

### "Cannot find module 'pg'"
```bash
pnpm install pg
```

### "Cannot find module 'drizzle-orm'"
```bash
pnpm install drizzle-orm
```

### "Database connection refused"
- Check DATABASE_URL is correct
- For Neon: ensure `?sslmode=require` is in the URL
- Check your Neon project allows connections from your IP

### "Migration fails with schema error"
```bash
# Try regenerating
npx drizzle-kit drop
npx drizzle-kit generate
npx drizzle-kit migrate
```

### "Port 3000 already in use"
```bash
# Kill existing process or use different port
PORT=3001 pnpm dev
```

## Migration Files

After running `npx drizzle-kit generate`, you'll see a `drizzle/` folder with migration files like:
- `0000_clean_initial_schema.sql`

These are SQL files that get applied to your database. You can review them to see what changes are being made.

## Manual Database Setup (Advanced)

If migrations fail, you can create tables manually using the SQL from the schema file:

```bash
# View the schema
cat db/schema.ts

# Or copy the migration SQL from drizzle/ folder
cat drizzle/*.sql
```

Then paste the SQL directly into your database client.

## Next Steps After Migration

1. **Test the API**: Use POSTMAN_COLLECTION.json to test endpoints
2. **Create demo**: Follow QUICK_START.md examples
3. **Check documentation**: Read README.md for full API details

## Need Help?

- Read QUICK_START.md (5-minute guide)
- Read README.md (complete API documentation)
- Check ARCHITECTURE.md (system design)
- Review POSTMAN_COLLECTION.json (API examples)

## Files Included

✓ `drizzle.config.json` - Drizzle configuration
✓ `.env.example` - Environment variable template  
✓ `setup.sh` - Mac/Linux setup script
✓ `setup.bat` - Windows setup script
✓ `db/schema.ts` - Database schema
✓ `db/index.ts` - Database connection

Everything you need is included. Just add your DATABASE_URL and run the setup!
