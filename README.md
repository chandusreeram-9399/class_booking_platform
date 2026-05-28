# Global Class Offering Booking System

A production-ready backend service for managing live online classes with support for timezone handling, concurrent booking requests, and conflict detection.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Language**: TypeScript

## Project Overview

This system enables teachers to create courses and schedule offerings (sections) with multiple sessions, while parents/students can view available offerings and book them while respecting timezone differences and preventing scheduling conflicts.

### Core Concepts

1. **Course/Class**: A course definition (e.g., "Python Coding", "Art Drawing")
2. **Offering/Section**: A schedulable version of a course (e.g., "Saturday Batch")
3. **Sessions**: Actual meeting times belonging to an offering
4. **Bookings**: Parent/student registrations for offerings

## Architecture

### Folder Structure

```
/vercel/share/v0-project/
├── app/
│   ├── api/
│   │   ├── bookings/
│   │   │   └── route.ts           # Booking management endpoints
│   │   ├── courses/
│   │   │   └── route.ts           # Course creation & management
│   │   ├── offerings/
│   │   │   └── route.ts           # Offering creation & retrieval
│   │   ├── sessions/
│   │   │   └── route.ts           # Session addition to offerings
│   │   └── users/
│   │       └── route.ts           # User creation & management
│   ├── layout.tsx
│   └── page.tsx
├── db/
│   ├── index.ts                   # Database connection setup
│   └── schema.ts                  # Drizzle ORM schema definitions
├── lib/
│   ├── api-response.ts            # API response formatting & error codes
│   ├── timezone.ts                # Timezone conversion utilities
│   └── services/
│       ├── booking.ts             # Booking business logic
│       └── offering.ts            # Offering business logic
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- PostgreSQL database (Neon)

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database connection
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run database migrations:
   ```bash
   npx drizzle-kit migrate
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

The API will be available at `http://localhost:3000/api`

## Database Schema Overview

### Tables

1. **users** - Stores teachers and parents
   - Columns: id, email, name, role (teacher/parent), timezone, createdAt, updatedAt
   - Indexes: email, role

2. **courses** - Course definitions
   - Columns: id, name, description, teacherId, createdAt, updatedAt
   - Foreign Key: teacherId → users.id

3. **offerings** - Schedulable course sections
   - Columns: id, courseId, name, teacherId, teacherTimezone, maxCapacity, price, createdAt, updatedAt
   - Foreign Keys: courseId → courses.id, teacherId → users.id
   - Indexes: courseId, teacherId

4. **sessions** - Individual meeting times (stored in UTC)
   - Columns: id, offeringId, teacherId, startTimeUtc, endTimeUtc, createdAt
   - Foreign Keys: offeringId → offerings.id, teacherId → users.id
   - Indexes: offeringId, teacherId, startTimeUtc

5. **bookings** - Parent registrations for offerings
   - Columns: id, offeringId, parentId, status, bookedAt, createdAt
   - Foreign Keys: offeringId → offerings.id, parentId → users.id
   - Unique Constraint: (parentId, offeringId)

6. **booking_conflict_logs** - Audit trail for conflict detection
   - Columns: id, parentId, requestedOfferingId, conflictingSessionId, conflictingOfferingId, reason, createdAt

## API Documentation

### Authentication

Currently, the API uses `userId` (passed as `teacherId` or `parentId`) for identification. In production, implement proper JWT or session-based authentication.

### Base URL

```
http://localhost:3000/api
```

### Response Format

All endpoints return a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {...}
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### User Endpoints

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "email": "teacher@example.com",
  "name": "John Doe",
  "role": "teacher",
  "timezone": "America/New_York"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "teacher@example.com",
    "name": "John Doe",
    "role": "teacher",
    "timezone": "America/New_York",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get User
```http
GET /api/users?id=1
```

**Response:** `200 OK`

### Course Endpoints

#### Create Course
```http
POST /api/courses
Content-Type: application/json

{
  "teacherId": 1,
  "name": "Python Coding",
  "description": "Learn Python programming basics"
}
```

**Response:** `201 Created`

#### Get Courses
```http
GET /api/courses
GET /api/courses?teacherId=1
```

**Response:** `200 OK`

### Offering Endpoints

#### Create Offering
```http
POST /api/offerings
Content-Type: application/json

{
  "teacherId": 1,
  "courseId": 1,
  "name": "Saturday Batch",
  "teacherTimezone": "America/New_York",
  "maxCapacity": 30,
  "price": 9999
}
```

**Response:** `201 Created`

#### Get Offerings
```http
GET /api/offerings                          # Get all available offerings
GET /api/offerings?teacherId=1              # Get teacher's offerings
GET /api/offerings?id=1                     # Get specific offering details
GET /api/offerings?timezone=America/New_York # Include parent's timezone for display
```

**Response:** `200 OK`

### Session Endpoints

#### Add Session to Offering
```http
POST /api/sessions
Content-Type: application/json

{
  "teacherId": 1,
  "offeringId": 1,
  "startTime": "2024-01-20T18:00:00",
  "endTime": "2024-01-20T19:00:00",
  "timezone": "America/New_York"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "offeringId": 1,
    "startTimeUtc": "2024-01-20T23:00:00.000Z",
    "endTimeUtc": "2024-01-21T00:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Booking Endpoints

#### Book an Offering
```http
POST /api/bookings
Content-Type: application/json

{
  "parentId": 2,
  "offeringId": 1
}
```

**Response:** `201 Created` or `409 Conflict` (if time overlaps)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "offeringId": 1,
    "parentId": 2,
    "status": "confirmed",
    "bookedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Conflict Response (409):**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Booking conflicts with existing bookings",
    "details": {
      "conflicts": [
        {
          "conflictingOfferingId": 2,
          "conflictingOfferingName": "Roblox Game Design",
          "sessions": [...]
        }
      ]
    }
  }
}
```

#### Check for Conflicts
```http
GET /api/bookings?parentId=2&checkConflicts=true&offeringId=1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hasConflicts": false,
    "conflicts": []
  }
}
```

#### Get Parent's Bookings
```http
GET /api/bookings?parentId=2
```

**Response:** `200 OK`

#### Cancel Booking
```http
DELETE /api/bookings?id=1&parentId=2
```

**Response:** `200 OK`

## Key Features & Implementation Details

### 1. Timezone Handling

- **Teacher Perspective**: Teachers create offerings in their local timezone. Sessions are stored in UTC.
- **Parent Perspective**: Parents view all times in their local timezone.
- **Conversion**: All times are converted to/from UTC using `date-fns-tz` library.

**Timezone Utilities** (`lib/timezone.ts`):
- `convertUTCToUserTimezone()` - Convert UTC to user's timezone
- `convertUserTimezoneToUTC()` - Convert user's timezone to UTC
- `formatDateInTimezone()` - Format dates in specific timezone
- `doTimeRangesOverlap()` - Check if two time ranges overlap

### 2. Booking Rules

#### Rule 1: Offering-Level Booking
- Parents book entire offerings, not individual sessions
- All sessions in an offering must have the same commitment

#### Rule 2: Time Conflict Locking
- Once booked, parent cannot book overlapping offerings
- Sessions are checked for ANY overlap (even partial)
- Conflicts are detected before booking attempt

#### Rule 3: Concurrent Booking Handling
- Uses database constraints (`UNIQUE` on parentId, offeringId)
- Capacity checks happen before insertion
- Race conditions are handled with constraint violations
- Audit trail maintained in `booking_conflict_logs`

### 3. Concurrency Management

**Conflict Detection Strategy:**
1. Check capacity before booking
2. Check time overlaps with existing bookings
3. Attempt insert with unique constraint
4. If constraint violated, return appropriate error

**Transaction Isolation:**
- Database handles concurrent requests
- Unique constraint prevents duplicate bookings
- Capacity validation prevents overbooking

### 4. Error Handling

All errors are returned with standardized error codes:

- `INVALID_INPUT` (400) - Missing or invalid parameters
- `INVALID_TIMEZONE` (400) - Invalid timezone identifier
- `UNAUTHORIZED` (401) - Missing authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `BOOKING_CONFLICT` (409) - Time overlap detected
- `OFFERING_FULL` (409) - Offering at capacity
- `DUPLICATE_BOOKING` (409) - Parent already booked this offering
- `INTERNAL_ERROR` (500) - Server error

## Testing the API

### Example: Complete Workflow

#### 1. Create Users
```bash
# Create teacher
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "name": "John Doe",
    "role": "teacher",
    "timezone": "America/New_York"
  }'

# Create parent
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "name": "Jane Smith",
    "role": "parent",
    "timezone": "America/Los_Angeles"
  }'
```

#### 2. Create Course
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": 1,
    "name": "Python Coding",
    "description": "Learn Python basics"
  }'
```

#### 3. Create Offering
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

#### 4. Add Sessions
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

#### 5. Book Offering
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": 2,
    "offeringId": 1
  }'
```

#### 6. Get Parent's Bookings
```bash
curl http://localhost:3000/api/bookings?parentId=2
```

## Assumptions

1. **User Role**: Users are created as either "teacher" or "parent". Teachers can create courses/offerings; parents can only book.
2. **Timezone Validation**: Only IANA timezone identifiers are accepted (e.g., "America/New_York").
3. **Price Format**: Prices are stored as integers (cents). Multiply actual price by 100.
4. **Session Overlap Check**: Any partial overlap is considered a conflict (no back-to-back bookings).
5. **UTC Storage**: All session times are stored in UTC for consistency.
6. **Concurrency**: Uses database constraints for concurrent request handling, not application-level locking.

## Concurrency Handling Approach

### Strategy: Optimistic Locking + Database Constraints

1. **Capacity Validation**: Check available spots before booking
2. **Conflict Detection**: Query existing bookings and check time overlaps
3. **Database Constraint**: Unique constraint on (parentId, offeringId) prevents duplicate bookings
4. **Error Recovery**: Clear error messages guide client on retry strategy

### Why This Approach?

- **Scalability**: No server-side locks or queues
- **Consistency**: Database constraints ensure data integrity
- **Performance**: Single round-trip to database
- **Simplicity**: No complex distributed transaction logic

### Race Condition Scenarios Handled

1. **Multiple Parents Booking Same Offering**:
   - Each parent's request checks capacity independently
   - Database enforces capacity through business logic
   - First N parents succeed; others get "OFFERING_FULL" error

2. **Parent Booking Conflicting Offerings Simultaneously**:
   - First booking succeeds
   - Second booking fails with "BOOKING_CONFLICT"
   - Clear error message explains the conflict

3. **Duplicate Booking Attempts**:
   - Database unique constraint prevents duplicates
   - Returns "DUPLICATE_BOOKING" error

## Timezone Handling Approach

### Storage Strategy
- **All times stored in UTC** for consistency and accuracy
- Teachers input times in their timezone, converted to UTC
- Parents view times in their timezone, converted from UTC

### Conversion Flow

**Teacher Creating Session:**
```
Teacher Input (America/New_York): 2024-01-20 18:00:00
↓
Convert to UTC: 2024-01-20 23:00:00
↓
Store in Database: 2024-01-20 23:00:00 UTC
```

**Parent Viewing Session:**
```
Database (UTC): 2024-01-20 23:00:00
↓
Convert to Parent TZ (America/Los_Angeles): 2024-01-20 15:00:00
↓
Display to Parent: 2024-01-20 15:00:00 PST
```

### Conflict Detection
- All overlaps checked in UTC (neutral timezone)
- Ensures consistent conflict detection regardless of timezones involved

## Production Considerations

1. **Authentication**: Implement JWT or session-based authentication
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Validation**: Implement request validation middleware
4. **Logging**: Add structured logging for debugging
5. **Monitoring**: Set up error tracking and performance monitoring
6. **Caching**: Add caching for frequently accessed data
7. **Testing**: Add unit and integration tests
8. **Documentation**: Keep API documentation synchronized with code

## Future Enhancements

1. **Payment Integration**: Stripe integration for booking payments
2. **Notifications**: Email/SMS notifications for bookings and cancellations
3. **Waitlist Management**: Support for waitlisting when offerings are full
4. **Cancellation Policies**: Implement refund policies and cancellation deadlines
5. **Teacher Reviews**: Rating and review system for teachers and offerings
6. **Multi-language Support**: Internationalization support
7. **Analytics**: Dashboard for teachers and system administrators
8. **Advanced Search**: Filters by subject, duration, price, etc.

## Database Migrations

The schema is defined in `db/schema.ts` using Drizzle ORM. To run migrations:

```bash
# Generate migration
npx drizzle-kit generate

# Run migration
npx drizzle-kit migrate
```

## Support

For issues or questions:
1. Check the API documentation in this README
2. Review error messages and error codes
3. Check the codebase comments for implementation details
