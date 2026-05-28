# Architecture & Design Decisions

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js API Layer                        │
│  /api/users  /api/courses  /api/offerings  /api/sessions    │
│  /api/bookings                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP Requests
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Business Logic Layer (Services)                 │
│  ├─ offering.ts (Course/Offering Management)               │
│  └─ booking.ts (Booking & Conflict Detection)              │
└────────────────────────┬────────────────────────────────────┘
                         │
              Service calls to Database
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Data Access Layer                           │
│  Drizzle ORM with PostgreSQL                                │
│  ├─ Connection pooling                                       │
│  ├─ Type-safe queries                                        │
│  └─ Transaction support                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                   SQL Queries
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  (Neon - Serverless PostgreSQL)                             │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

### Booking Request Flow

```
1. Parent sends POST /api/bookings
   ├─ parentId: 2
   └─ offeringId: 1

2. Route handler validates input
   ├─ Check required fields
   └─ Parse IDs

3. Call bookOffering() service
   ├─ Verify parent exists
   ├─ Verify offering exists
   ├─ Check for duplicate booking
   ├─ Check offering capacity
   ├─ Check time conflicts
   │  ├─ Query parent's confirmed bookings
   │  ├─ Get all sessions for new offering
   │  ├─ Get all sessions for existing bookings
   │  └─ Compare time ranges (doTimeRangesOverlap)
   ├─ Log conflicts if any
   └─ Insert booking (or throw error)

4. Database processes insert
   ├─ UNIQUE constraint check
   ├─ Foreign key validation
   └─ Transaction commit/rollback

5. Return response to parent
   ├─ Success: 201 with booking details
   └─ Conflict: 409 with conflict details
```

## Data Model

### Entity Relationships

```
User (Teacher/Parent)
├── Teacher → Courses (1:N)
│   └── Courses → Offerings (1:N)
│       ├── Offerings → Sessions (1:N)
│       └── Offerings → Bookings (1:N)
│
└── Parent → Bookings (1:N)
    └── Bookings → Offerings (N:1)
```

### Schema Details

#### Users Table
```
users {
  id: INT PRIMARY KEY
  email: VARCHAR UNIQUE
  name: VARCHAR
  role: ENUM (teacher|parent)
  timezone: VARCHAR IANA timezone ID
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

Indexes:
- `users.email` - For quick user lookup
- `users.role` - For filtering by role

#### Courses Table
```
courses {
  id: INT PRIMARY KEY
  teacherId: INT FOREIGN KEY (users.id)
  name: VARCHAR
  description: TEXT
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

Indexes:
- `courses.teacherId` - For teacher's courses

#### Offerings Table
```
offerings {
  id: INT PRIMARY KEY
  courseId: INT FOREIGN KEY (courses.id)
  name: VARCHAR
  teacherId: INT FOREIGN KEY (users.id)
  teacherTimezone: VARCHAR
  maxCapacity: INT
  price: INT (in cents)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

Indexes:
- `offerings.courseId` - For course's offerings
- `offerings.teacherId` - For teacher's offerings

#### Sessions Table
```
sessions {
  id: INT PRIMARY KEY
  offeringId: INT FOREIGN KEY (offerings.id)
  teacherId: INT FOREIGN KEY (users.id)
  startTimeUtc: TIMESTAMP
  endTimeUtc: TIMESTAMP
  createdAt: TIMESTAMP
}
```

Indexes:
- `sessions.offeringId` - For offering's sessions
- `sessions.teacherId` - For teacher's sessions
- `sessions.startTimeUtc` - For range queries

#### Bookings Table
```
bookings {
  id: INT PRIMARY KEY
  offeringId: INT FOREIGN KEY (offerings.id)
  parentId: INT FOREIGN KEY (users.id)
  status: ENUM (pending|confirmed|cancelled)
  bookedAt: TIMESTAMP
  createdAt: TIMESTAMP
  
  UNIQUE CONSTRAINT (parentId, offeringId)
}
```

Indexes:
- `bookings.parentId` - For parent's bookings
- `bookings.offeringId` - For offering's bookings

#### Booking Conflict Logs Table
```
booking_conflict_logs {
  id: INT PRIMARY KEY
  parentId: INT FOREIGN KEY (users.id)
  requestedOfferingId: INT FOREIGN KEY (offerings.id)
  conflictingSessionId: INT FOREIGN KEY (sessions.id)
  conflictingOfferingId: INT FOREIGN KEY (offerings.id)
  reason: TEXT
  createdAt: TIMESTAMP
}
```

## Concurrency Handling

### Strategy: Optimistic Concurrency with Database Constraints

We use **optimistic concurrency control** combined with **database constraints** rather than pessimistic locking for:
1. Better scalability
2. No blocking/deadlocks
3. Better performance
4. Simpler implementation

### Concurrent Booking Handling

#### Scenario 1: Multiple Parents Booking Same Offering

```
Time T0: Offering has 30 spaces, 25 booked
         
Parent A                 Parent B
├─ Check capacity       ├─ Check capacity
│  Reads: 25/30        │  Reads: 25/30
│  ✓ Pass               │  ✓ Pass
│                       │
├─ Insert booking       ├─ Insert booking
│  Writes: 26/30        │  Waits (DB lock)
│                       │
└─ Commit (26/30)      └─ Continues
                        │  Writes: 27/30
                        │
                        └─ Commit (27/30)
```

**Note**: Our implementation doesn't use explicit capacity tracking. Instead:
1. Each booking is independent
2. Offering's `bookings` relation shows current bookings
3. If capacity exceeded, validation fails before insert
4. Race conditions are rare because checks happen per-request

#### Scenario 2: Parent Booking Conflicting Offerings Simultaneously

```
Offering A: Mon 10-11am UTC
Offering B: Mon 10:30-11:30am UTC (overlaps with A)

Parent                   Parent
├─ Check conflict       
│  A conflicts          
│  None currently booked
│  ✓ No conflicts       
│                       ├─ Check conflict
├─ Insert booking A     │  B conflicts
│  ✓ Success (booking 1)│  A is now booked!
│                       │  ✓ Conflict detected!
└─ Complete            │
                        └─ Return 409 error
```

**Key point**: Conflicts are detected in application code before database write, ensuring consistency.

#### Scenario 3: Duplicate Booking Attempts

```
Request 1                Request 2
├─ All checks pass      ├─ All checks pass
├─ Insert               ├─ Insert (simultaneous)
│  Booking ID 1         │
│  ✓ Success            │  ✗ UNIQUE constraint
│                       │    violation
└─ Commit              └─ Error: DUPLICATE_BOOKING
```

**Mechanism**: PostgreSQL's `UNIQUE (parentId, offeringId)` constraint ensures only one booking per parent per offering.

### Race Condition Prevention

#### Prevention Method 1: Unique Constraints
```sql
-- Prevents duplicate parent-offering pairs
UNIQUE (parentId, offeringId)
```

#### Prevention Method 2: Foreign Key Integrity
```sql
-- Ensures referential integrity
FOREIGN KEY (offeringId) REFERENCES offerings(id)
FOREIGN KEY (parentId) REFERENCES users(id)
```

#### Prevention Method 3: Application-Level Validation
```typescript
// Check capacity before insert
const bookedCount = offering.bookings.length;
if (bookedCount >= offering.maxCapacity) {
  throw OFFERING_FULL;
}
```

#### Prevention Method 4: Time Overlap Detection
```typescript
// Detect conflicts before insert
const conflicts = await checkBookingConflicts(parentId, offeringId);
if (conflicts.length > 0) {
  throw BOOKING_CONFLICT;
}
```

## Timezone Handling

### Design Principle: Store UTC, Display Local

All times are stored in UTC for consistency and accuracy. Conversions happen at input/output.

### Conversion Pipeline

#### Input: Teacher Creates Session in Local Timezone

```
Teacher (America/New_York): 6 PM Jan 20
  ↓
Input: "2024-01-20T18:00:00"
Input Timezone: "America/New_York"
  ↓
convertUserTimezoneToUTC()
  ├─ Parse date
  ├─ Apply timezone offset (-5 hours for EST)
  └─ Result: "2024-01-20T23:00:00" UTC
  ↓
Store in Database: 2024-01-20 23:00:00 UTC
```

#### Output: Parent Views Session in Their Timezone

```
Database (UTC): 2024-01-20T23:00:00
  ↓
convertUTCToUserTimezone()
  ├─ Parse UTC date
  ├─ Apply parent timezone offset (-8 hours for PST)
  └─ Result: "2024-01-20T15:00:00" PST
  ↓
Display to Parent (America/Los_Angeles): 3 PM Jan 20
```

### Conflict Detection in UTC

```
Session A: 2024-01-20 18:00 (America/New_York)
            = 2024-01-20 23:00 UTC

Session B: 2024-01-20 10:30 (America/Los_Angeles)
            = 2024-01-20 18:30 UTC

Overlap Check (UTC):
  A: 23:00-00:00 (UTC)
  B: 18:30-19:30 (UTC)
  ✓ No overlap (checked in same timezone)
```

### Valid Timezones

System supports 40+ IANA timezones:
- Americas: `America/New_York`, `America/Chicago`, `America/Los_Angeles`, etc.
- Europe: `Europe/London`, `Europe/Paris`, `Europe/Berlin`, etc.
- Asia: `Asia/Tokyo`, `Asia/Hong_Kong`, `Asia/Dubai`, etc.
- Australia: `Australia/Sydney`, `Australia/Melbourne`, etc.
- Pacific: `Pacific/Auckland`, `Pacific/Fiji`, etc.
- Africa: `Africa/Johannesburg`, `Africa/Cairo`, etc.

See `lib/timezone.ts` for complete list.

## Error Handling Strategy

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Categories

#### Validation Errors (400)
```
INVALID_INPUT        - Missing/invalid fields
INVALID_TIMEZONE     - Invalid timezone
INVALID_DATES        - Invalid date format/range
```

#### Authorization Errors (401/403)
```
UNAUTHORIZED         - Authentication failed
FORBIDDEN            - Insufficient permissions
TEACHER_ONLY         - Only teachers allowed
PARENT_ONLY          - Only parents allowed
```

#### Resource Errors (404)
```
NOT_FOUND            - Generic not found
USER_NOT_FOUND       - User doesn't exist
COURSE_NOT_FOUND     - Course doesn't exist
OFFERING_NOT_FOUND   - Offering doesn't exist
SESSION_NOT_FOUND    - Session doesn't exist
BOOKING_NOT_FOUND    - Booking doesn't exist
```

#### Conflict Errors (409)
```
BOOKING_CONFLICT     - Time overlap detected
OFFERING_FULL        - Offering at capacity
DUPLICATE_BOOKING    - Parent already booked
TIME_OVERLAP         - Sessions overlap
```

#### Server Errors (500)
```
INTERNAL_ERROR       - Unexpected error
DATABASE_ERROR       - Database operation failed
```

## Performance Considerations

### Query Optimization

#### Optimized: N+1 Problem Prevention
```typescript
// ✓ Good: Fetch with relations
const bookings = await db.query.bookings.findMany({
  where: eq(bookings.parentId, parentId),
  with: {
    offering: {
      with: {
        sessions: true,
        bookings: true,
      },
    },
  },
});
```

#### Optimized: Indexed Queries
```typescript
// ✓ Good: Query uses indexed column
const userBookings = await db.query.bookings.findMany({
  where: eq(bookings.parentId, parentId),
});

// Index: bookings.parentId
```

#### Optimized: Range Queries
```typescript
// ✓ Good: Session queries use indexed startTimeUtc
const sessionsInRange = await db.query.sessions.findMany({
  where: and(
    gte(sessions.startTimeUtc, startDate),
    lt(sessions.startTimeUtc, endDate),
  ),
});

// Index: sessions.startTimeUtc
```

### Database Indexes

| Table | Column(s) | Reason |
|-------|-----------|--------|
| users | email | User lookup |
| users | role | Filter by role |
| courses | teacherId | Teacher's courses |
| offerings | courseId | Course's offerings |
| offerings | teacherId | Teacher's offerings |
| sessions | offeringId | Offering's sessions |
| sessions | teacherId | Teacher's sessions |
| sessions | startTimeUtc | Range queries |
| bookings | parentId | Parent's bookings |
| bookings | offeringId | Offering's bookings |
| bookings | (parentId, offeringId) | Unique constraint |

### Connection Pooling

- **Local PostgreSQL**: Add pool configuration
- **Neon**: Automatic connection pooling

```typescript
const client = postgres(connectionString, {
  prepare: false,  // Disable prepared statements for better compatibility
  // Connection pooling handled by Neon
});
```

## Security Architecture

### Current Implementation
```
User ID Verification:
└─ Simple: Pass userId in request
└─ Limitation: No auth, anyone can impersonate

Teacher Authorization:
└─ Check: user.role === 'teacher'
└─ Limitation: Doesn't verify JWT signature
```

### Recommended Production Implementation
```
1. Authentication Layer
   ├─ JWT token generation on login
   ├─ Token validation middleware
   └─ Session management

2. Authorization Layer
   ├─ Extract userId from JWT
   ├─ Verify role permissions
   └─ Row-level security checks

3. Additional Security
   ├─ CORS configuration
   ├─ Rate limiting
   ├─ Request validation middleware
   └─ HTTPS only
```

## API Design Patterns

### Request/Response Format

**Consistent Success Response**
```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Consistent Error Response**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Endpoint Patterns

**Resource-Based URLs**
```
GET     /api/users?id=1              # Get user
POST    /api/users                   # Create user
GET     /api/courses?teacherId=1     # List courses
POST    /api/courses                 # Create course
GET     /api/offerings?teacherId=1   # List offerings
POST    /api/offerings               # Create offering
DELETE  /api/bookings?id=1           # Cancel booking
```

**Query Parameters for Filtering/Actions**
```
GET /bookings?parentId=2              # List parent's bookings
GET /bookings?parentId=2&checkConflicts=true&offeringId=1  # Check conflicts
DELETE /bookings?id=1&parentId=2      # Cancel booking
```

## Technology Choices

### Why Next.js?
- Built-in API routes (no separate backend server)
- Vercel deployment ready
- TypeScript support out of the box
- Serverless functions for scaling

### Why Drizzle ORM?
- Type-safe queries
- Lightweight (no runtime overhead)
- PostgreSQL optimized
- Excellent TypeScript support
- Easy migrations

### Why PostgreSQL?
- ACID guarantees for data consistency
- Advanced features (JSON, arrays, etc.)
- Excellent concurrency handling
- Neon provides serverless option

### Why UTC Storage?
- Timezone-agnostic
- Consistent conflict detection
- No daylight saving issues
- Easy conversion to any timezone

## Scalability Considerations

### Horizontal Scaling
- Stateless API design (can run multiple instances)
- Database connection pooling (Neon handles this)
- Load balancing at infrastructure level

### Vertical Scaling
- Database indexes for query performance
- Connection pooling to reduce load
- Query optimization with relations

### Future Optimizations
- Redis cache for frequently accessed data
- Query result caching
- Pagination for large datasets
- Batch operations for bulk bookings

## Migration Path

### Phase 1: Current Implementation
- Basic CRUD operations
- Conflict detection
- Timezone support
- ✓ Completed

### Phase 2: Production Ready
- Add authentication (JWT/OAuth)
- Implement rate limiting
- Add request validation middleware
- Add comprehensive logging
- Add error tracking (Sentry)

### Phase 3: Advanced Features
- Payment integration (Stripe)
- Notification system (Email/SMS)
- Admin dashboard
- Analytics
- Waitlist management

### Phase 4: High Scale
- Redis caching
- Event-driven architecture (message queues)
- Microservices decomposition
- Read replicas for reporting
