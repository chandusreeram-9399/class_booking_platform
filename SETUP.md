# Global Class Offering Booking System - Setup Guide

## Quick Start

### 1. Prerequisites

- Node.js 18 or higher
- pnpm 8+ (or npm/yarn)
- PostgreSQL database (recommended: Neon for serverless PostgreSQL)
- Git (for version control)

### 2. Clone/Setup Project

```bash
# If cloning from GitHub
git clone https://github.com/your-repo/global-class-booking.git
cd global-class-booking

# If starting fresh
pnpm install
```

### 3. Database Setup

#### Option A: Using Neon (Recommended for Serverless)

1. Create account at https://neon.tech
2. Create a new project and copy the connection string
3. Create `.env.local` file:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:

```bash
createdb class_booking_system
```

3. Create `.env.local`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/class_booking_system
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Run Database Migrations

The `drizzle.config.json` is pre-configured. Just run:

```bash
# Generate schema from drizzle.config.json
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate
```

If you get "drizzle.config.json file does not exist", ensure you copied it from the project root.

### 6. Start Development Server

```bash
pnpm dev
```

The API will be available at `http://localhost:3000/api`

## Detailed Setup

### Environment Configuration

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Optional: For production deployment
NODE_ENV=development
```

### Database Migration Commands

```bash
# Generate migration files based on schema changes
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate

# Push schema directly (for development)
npx drizzle-kit push

# Drop all tables (careful!)
npx drizzle-kit drop

# View studio UI
npx drizzle-kit studio
```

### Folder Structure Explanation

```
app/
├── api/
│   ├── bookings/           # POST, GET, DELETE /api/bookings
│   ├── courses/            # POST, GET /api/courses
│   ├── offerings/          # POST, GET /api/offerings
│   ├── sessions/           # POST /api/sessions
│   └── users/              # POST, GET /api/users
├── layout.tsx              # Root layout
└── page.tsx                # Home page (optional)

db/
├── index.ts                # Database connection
└── schema.ts               # Drizzle ORM schema

lib/
├── api-response.ts         # Response formatting & error codes
├── timezone.ts             # Timezone utilities
└── services/
    ├── booking.ts          # Booking logic
    └── offering.ts         # Offering logic
```

## API Testing

### Using Postman

1. Import `POSTMAN_COLLECTION.json` into Postman
2. Update the `base_url` variable to `http://localhost:3000/api`
3. Execute requests in the "Workflow - Complete Example" folder

### Using curl

#### Create Teacher
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "name": "John Doe",
    "role": "teacher",
    "timezone": "America/New_York"
  }'
```

#### Create Parent
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "name": "Jane Smith",
    "role": "parent",
    "timezone": "America/Los_Angeles"
  }'
```

#### Create Course
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "name": "Python Coding",
    "description": "Learn Python programming basics"
  }'
```

#### Create Offering
```bash
curl -X POST http://localhost:3000/api/offerings \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "courseId": 1,
    "name": "Saturday Batch",
    "teacherTimezone": "America/New_York",
    "maxCapacity": 30,
    "price": 9999
  }'
```

#### Add Session
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "offeringId": 1,
    "startTime": "2024-01-20T18:00:00",
    "endTime": "2024-01-20T19:00:00",
    "timezone": "America/New_York"
  }'
```

#### Book Offering
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": 2,
    "offeringId": 1
  }'
```

#### View Bookings
```bash
curl http://localhost:3000/api/bookings?parentId=2
```

## Troubleshooting

### Database Connection Issues

**Problem**: `Database connection refused`

**Solution**:
- Verify DATABASE_URL in `.env.local`
- Check if PostgreSQL is running
- Ensure credentials are correct
- For Neon, verify connection string includes `?sslmode=require`

### Migration Issues

**Problem**: `Table already exists`

**Solution**:
```bash
# Drop and recreate
npx drizzle-kit drop
npx drizzle-kit migrate
```

### Port Already in Use

**Problem**: `Error: Port 3000 is already in use`

**Solution**:
```bash
# Run on different port
PORT=3001 pnpm dev
```

### TypeScript Errors

**Problem**: `Cannot find module '@/db'`

**Solution**:
- Clear `node_modules` and reinstall:
```bash
rm -rf node_modules
pnpm install
```

- Rebuild TypeScript:
```bash
pnpm tsc --noEmit
```

## Production Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` - Production Neon connection string
4. Deploy

```bash
# Using Vercel CLI
vercel deploy
```

### Docker Setup (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t class-booking-system .
docker run -p 3000:3000 -e DATABASE_URL=... class-booking-system
```

## Development Tips

### Enable TypeScript Strict Mode

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### Add Request Logging

Edit route handlers to add logging:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log(`[${new Date().toISOString()}] POST ${request.nextUrl.pathname}`);
  console.log('Body:', await request.json());
  // ... rest of handler
}
```

### Debug Database Queries

Enable Drizzle logging:

```typescript
// db/index.ts
export const db = drizzle(client, {
  schema,
  logger: true, // Enable query logging
});
```

### Test Timezone Handling

```bash
# Test timezone conversion
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "offeringId": 1,
    "startTime": "2024-01-20T18:00:00",
    "endTime": "2024-01-20T19:00:00",
    "timezone": "Asia/Tokyo"
  }'
```

## Performance Optimization

### 1. Add Database Indexes

Indexes are already defined in `db/schema.ts` for:
- `users.email`
- `users.role`
- `courses.teacherId`
- `offerings.courseId` and `teacherId`
- `sessions.offeringId`, `teacherId`, `startTimeUtc`
- `bookings.parentId` and `offeringId`

### 2. Connection Pooling

Neon automatically provides connection pooling. For local PostgreSQL, add to connection string:

```env
DATABASE_URL=postgresql://user:password@localhost/db?min_pool_size=5&max_pool_size=20
```

### 3. Query Optimization

- Use `where` clauses to limit data
- Use `with` (joins) to fetch related data efficiently
- Avoid N+1 queries

## Security Considerations

### 1. Input Validation

All endpoints validate:
- Required fields
- Email format
- Timezone validity
- Date/time format
- User roles

### 2. Authorization

Current implementation:
- Checks teacher role for course/offering creation
- Checks parent role for bookings
- Verifies user owns their data

**TODO for Production**:
- Implement JWT authentication
- Add session management
- Implement CORS properly
- Add rate limiting
- Add request validation middleware

### 3. SQL Injection Prevention

- Using Drizzle ORM with parameterized queries
- No string concatenation in SQL

### 4. Data Sensitivity

- No passwords stored (add authentication layer)
- No sensitive data in logs
- Consider encryption for PII

## Next Steps

1. ✅ Set up development environment
2. ✅ Run migrations
3. ✅ Test API with sample requests
4. ✅ Review database schema
5. TODO: Implement authentication
6. TODO: Add request validation
7. TODO: Add error handling middleware
8. TODO: Add logging/monitoring
9. TODO: Write unit tests
10. TODO: Deploy to production

## Support & Documentation

- **README.md** - Complete API documentation
- **openapi.yaml** - OpenAPI/Swagger specification
- **POSTMAN_COLLECTION.json** - Postman API collection
- **db/schema.ts** - Database schema with detailed comments
- **lib/services/** - Business logic implementation

## Quick Command Reference

```bash
# Installation
pnpm install
npx drizzle-kit migrate

# Development
pnpm dev

# Testing
npm test  # (when tests added)

# Building
pnpm build

# Production
pnpm start

# Database
npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit push
npx drizzle-kit studio
```
