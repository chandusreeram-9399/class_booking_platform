## Neon Database Setup Guide

You're almost there! Follow these exact steps:

### Step 1: Verify Your .env.local File

Open `.env.local` in your project root and make sure it looks like this:

```
DATABASE_URL="postgresql://neondb_owner:your_password@your_project.neon.tech/neondb?sslmode=require"
```

Replace the values with your actual Neon credentials:
- `neondb_owner` = your Neon database user (usually "neondb_owner")
- `your_password` = your database password
- `your_project` = your Neon project ID (the part before `.neon.tech`)
- `neondb` = your database name

**Example:**
```
DATABASE_URL="postgresql://neondb_owner:abc123xyz@ep-cool-cow-12345.neon.tech/neondb?sslmode=require"
```

### Step 2: Install Dependencies

```bash
pnpm install
```

This installs drizzle-kit which we just added to package.json.

### Step 3: Generate Database Schema

```bash
npx drizzle-kit generate
```

You should see output like:
```
✔ Your migrations are up to date
```

Or it may create a migration file - that's fine!

### Step 4: Run Migrations

```bash
npx drizzle-kit migrate
```

This creates all the tables in your Neon database. If successful, you'll see:
```
✔ Executing migrations
```

### Step 5: Start Your Dev Server

```bash
pnpm dev
```

You should see:
```
▲ Next.js 16.2.6
- Local:        http://localhost:3000
```

### Step 6: Test the API

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "name": "John Smith",
    "role": "teacher",
    "timezone": "America/New_York"
  }'
```

You should get a response with the user data.

---

## Troubleshooting

### Error: "Could not connect to database"

**Solution:** Check your DATABASE_URL in `.env.local`:
1. Password is correct
2. No typos in hostname
3. Port is 5432 (usually automatic)
4. `?sslmode=require` is at the end

### Error: "drizzle-kit: command not found"

**Solution:** Run `pnpm install` again to install drizzle-kit

### Error: "ENOENT: no such file or directory, open '.env.local'"

**Solution:** 
1. Make sure you're in the project root folder
2. Create .env.local (not .env)
3. Add DATABASE_URL to it

### Error: "Cannot find module 'drizzle-orm'"

**Solution:**
```bash
pnpm install
```

---

## Configuration Files Used

- `drizzle.config.ts` - Reads from DATABASE_URL in .env.local
- `.env.local` - Your Neon connection string
- `db/schema.ts` - Your database schema
- `drizzle/` - Generated migrations folder

---

## Next Steps

1. Test the API with Postman or curl
2. Follow QUICK_START.md for more examples
3. Create demo video
4. Submit code

---

## Get Your Neon Connection String

If you don't have it:

1. Go to https://console.neon.tech
2. Select your project
3. Click "Connection string"
4. Copy the PostgreSQL connection string
5. Paste into .env.local

The string looks like:
```
postgresql://neondb_owner:password@project-id.neon.tech/database-name?sslmode=require
```
