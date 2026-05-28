import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  bigint,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - Stores both teachers and parents
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role').notNull(), // 'teacher' or 'parent'
    timezone: text('timezone').notNull().default('UTC'), // User's timezone for display
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
  ]
);

// Courses table - Course/Class definitions
export const courses = pgTable(
  'courses',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('courses_teacher_id_idx').on(table.teacherId),
  ]
);

// Offerings/Sections table - Schedulable versions of courses
export const offerings = pgTable(
  'offerings',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., "Saturday Batch", "Summer Camp"
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teacherTimezone: text('teacher_timezone').notNull(), // Teacher's timezone when creating offering
    maxCapacity: integer('max_capacity').notNull().default(30),
    price: integer('price').notNull(), // Price in cents
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('offerings_course_id_idx').on(table.courseId),
    index('offerings_teacher_id_idx').on(table.teacherId),
  ]
);

// Sessions table - Actual meeting times
export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    offeringId: integer('offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Stored in UTC for consistency
    startTimeUtc: timestamp('start_time_utc').notNull(),
    endTimeUtc: timestamp('end_time_utc').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('sessions_offering_id_idx').on(table.offeringId),
    index('sessions_teacher_id_idx').on(table.teacherId),
    index('sessions_start_time_idx').on(table.startTimeUtc),
  ]
);

// Bookings table - Parent bookings of offerings
export const bookings = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    offeringId: integer('offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('confirmed'), // 'pending', 'confirmed', 'cancelled'
    bookedAt: timestamp('booked_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('bookings_parent_id_idx').on(table.parentId),
    index('bookings_offering_id_idx').on(table.offeringId),
    unique('unique_parent_offering').on(table.parentId, table.offeringId),
  ]
);

// Booking conflicts log - For audit trail and debugging
export const bookingConflictLogs = pgTable(
  'booking_conflict_logs',
  {
    id: serial('id').primaryKey(),
    parentId: integer('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedOfferingId: integer('requested_offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    conflictingSessionId: integer('conflicting_session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    conflictingOfferingId: integer('conflicting_offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('booking_conflict_logs_parent_id_idx').on(table.parentId),
  ]
);

// Relations for type safety
export const usersRelations = relations(users, ({ many }) => ({
  teacherCourses: many(courses),
  teacherOfferings: many(offerings),
  teacherSessions: many(sessions),
  parentBookings: many(bookings),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  teacher: one(users, {
    fields: [courses.teacherId],
    references: [users.id],
  }),
  offerings: many(offerings),
}));

export const offeringsRelations = relations(offerings, ({ one, many }) => ({
  course: one(courses, {
    fields: [offerings.courseId],
    references: [courses.id],
  }),
  teacher: one(users, {
    fields: [offerings.teacherId],
    references: [users.id],
  }),
  sessions: many(sessions),
  bookings: many(bookings),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  offering: one(offerings, {
    fields: [sessions.offeringId],
    references: [offerings.id],
  }),
  teacher: one(users, {
    fields: [sessions.teacherId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  offering: one(offerings, {
    fields: [bookings.offeringId],
    references: [offerings.id],
  }),
  parent: one(users, {
    fields: [bookings.parentId],
    references: [users.id],
  }),
}));
