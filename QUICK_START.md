# Quick Start Guide (5 Minutes)

## 1. Set Up Environment (1 min)

```bash
# Install dependencies
pnpm install

# Create .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
EOF
```

Replace with your Neon or PostgreSQL connection string.

## 2. Database Setup (1 min)

```bash
# Run migrations
npx drizzle-kit migrate
```

## 3. Start Server (1 min)

```bash
# Start development server
pnpm dev
```

Server runs at `http://localhost:3000/api`

## 4. Test API (2 min)

### Option A: Using curl

```bash
# 1. Create teacher
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "name": "John",
    "role": "teacher",
    "timezone": "America/New_York"
  }'

# 2. Create parent
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "name": "Jane",
    "role": "parent",
    "timezone": "America/Los_Angeles"
  }'

# 3. Create course
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "name": "Python Coding",
    "description": "Learn Python"
  }'

# 4. Create offering
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

# 5. Add session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "offeringId": 1,
    "startTime": "2024-02-10T10:00:00",
    "endTime": "2024-02-10T11:30:00",
    "timezone": "America/New_York"
  }'

# 6. Book offering
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": 2,
    "offeringId": 1
  }'

# 7. View bookings
curl http://localhost:3000/api/bookings?parentId=2
```

### Option B: Using Postman (Recommended)

1. Import `POSTMAN_COLLECTION.json` into Postman
2. Set `base_url` variable to `http://localhost:3000/api`
3. Run "Workflow - Complete Example" folder

## Project Structure

```
├── app/api/          # API endpoints (5 routes)
├── db/               # Database schema & connection
├── lib/              # Business logic & utilities
└── Documentation/
    ├── README.md              # Full API docs
    ├── SETUP.md               # Detailed setup
    ├── ARCHITECTURE.md        # Design details
    ├── openapi.yaml           # API spec
    └── POSTMAN_COLLECTION.json # Postman collection
```

## Key Files

| File | Purpose |
|------|---------|
| `db/schema.ts` | Database schema (6 tables) |
| `lib/services/booking.ts` | Booking logic & conflict detection |
| `lib/services/offering.ts` | Offering management |
| `lib/timezone.ts` | Timezone conversion |
| `app/api/*/route.ts` | API endpoints |

## API Overview

```
POST   /api/users                    # Create user
GET    /api/users?id=1               # Get user

POST   /api/courses                  # Create course
GET    /api/courses                  # List courses

POST   /api/offerings                # Create offering
GET    /api/offerings                # List offerings

POST   /api/sessions                 # Add session

POST   /api/bookings                 # Book offering
GET    /api/bookings?parentId=2      # Get bookings
DELETE /api/bookings?id=1&parentId=2 # Cancel booking
```

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `DATABASE_URL not set` | Add to `.env.local` |
| `Connection refused` | Check PostgreSQL is running |
| `Port 3000 in use` | Run `PORT=3001 pnpm dev` |
| `Invalid timezone` | Use IANA format (e.g., `America/New_York`) |
| `Booking conflict` | Sessions overlap with existing bookings |

## Testing Scenarios

### Scenario 1: Successful Booking
1. Create teacher (ID: 1)
2. Create parent (ID: 2)
3. Create course (ID: 1)
4. Create offering (ID: 1)
5. Add session
6. Book offering → ✅ Success

### Scenario 2: Conflict Detection
1. Book offering (session Mon 10-11am)
2. Try to book overlapping (Mon 10:30-11:30am)
→ ✅ Returns 409 Conflict with details

### Scenario 3: Timezone Conversion
1. Create offering with `America/New_York` timezone
2. Add session `6 PM Jan 20` in NY
3. Stored as `11 PM Jan 20` UTC
4. View from `America/Los_Angeles` shows `3 PM Jan 20`
→ ✅ Timezone conversion works

## Response Format

### Success
```json
{
  "success": true,
  "data": { /* resource */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Conflicts with existing bookings",
    "details": { /* conflict info */ }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Next Steps

1. ✅ Run `pnpm install && npx drizzle-kit migrate && pnpm dev`
2. ✅ Test with curl or Postman
3. ✅ Read `README.md` for full API documentation
4. ✅ Check `ARCHITECTURE.md` for design details
5. ✅ For deployment, see `SETUP.md` production section

## Documentation Files

- **README.md** (611 lines) - Complete API reference
- **SETUP.md** (474 lines) - Installation & troubleshooting
- **ARCHITECTURE.md** (639 lines) - Technical design
- **QUICK_START.md** (this file) - 5-minute setup
- **PROJECT_SUMMARY.md** (425 lines) - Overview
- **IMPLEMENTATION_CHECKLIST.md** (479 lines) - What's done
- **openapi.yaml** (673 lines) - OpenAPI spec
- **POSTMAN_COLLECTION.json** (502 lines) - API collection

## Support

- Check `README.md` for detailed API documentation
- Check `SETUP.md` troubleshooting section for common issues
- Check `ARCHITECTURE.md` for design decisions
- Use Postman for easy testing

---

**Ready to go!** 🚀

Run: `pnpm install && npx drizzle-kit migrate && pnpm dev`
