import { db, offerings, sessions, courses, users } from '@/db';
import { eq, and } from 'drizzle-orm';
import { convertUserTimezoneToUTC, isValidTimezone } from '@/lib/timezone';
import { ApiError, ERROR_CODES, getHttpStatusCode } from '@/lib/api-response';

interface CreateOfferingInput {
  courseId: number;
  name: string;
  teacherTimezone: string;
  maxCapacity?: number;
  price: number;
}

interface AddSessionInput {
  startTime: Date;
  endTime: Date;
  timezone: string;
}

/**
 * Create a new offering
 */
export async function createOffering(
  teacherId: number,
  input: CreateOfferingInput
): Promise<any> {
  // Validate teacher exists and is a teacher
  const teacher = await db.query.users.findFirst({
    where: eq(users.id, teacherId),
  });

  if (!teacher) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.USER_NOT_FOUND),
      ERROR_CODES.USER_NOT_FOUND,
      `Teacher with ID ${teacherId} not found`
    );
  }

  if (teacher.role !== 'teacher') {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.TEACHER_ONLY),
      ERROR_CODES.TEACHER_ONLY,
      'Only teachers can create offerings'
    );
  }

  // Validate course exists
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, input.courseId),
  });

  if (!course) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.COURSE_NOT_FOUND),
      ERROR_CODES.COURSE_NOT_FOUND,
      `Course with ID ${input.courseId} not found`
    );
  }

  if (course.teacherId !== teacherId) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.FORBIDDEN),
      ERROR_CODES.FORBIDDEN,
      'You can only create offerings for your own courses'
    );
  }

  // Validate timezone
  if (!isValidTimezone(input.teacherTimezone)) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.INVALID_TIMEZONE),
      ERROR_CODES.INVALID_TIMEZONE,
      `Invalid timezone: ${input.teacherTimezone}`
    );
  }

  // Create offering
  const result = await db
    .insert(offerings)
    .values({
      courseId: input.courseId,
      name: input.name,
      teacherId,
      teacherTimezone: input.teacherTimezone,
      maxCapacity: input.maxCapacity || 30,
      price: input.price,
    })
    .returning();

  return {
    id: result[0].id,
    courseId: result[0].courseId,
    name: result[0].name,
    teacherTimezone: result[0].teacherTimezone,
    maxCapacity: result[0].maxCapacity,
    price: result[0].price,
    createdAt: result[0].createdAt,
  };
}

/**
 * Add a session to an offering
 */
export async function addSessionToOffering(
  offeringId: number,
  teacherId: number,
  input: AddSessionInput
): Promise<any> {
  // Validate offering exists
  const offering = await db.query.offerings.findFirst({
    where: eq(offerings.id, offeringId),
  });

  if (!offering) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.OFFERING_NOT_FOUND),
      ERROR_CODES.OFFERING_NOT_FOUND,
      `Offering with ID ${offeringId} not found`
    );
  }

  if (offering.teacherId !== teacherId) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.FORBIDDEN),
      ERROR_CODES.FORBIDDEN,
      'You can only add sessions to your own offerings'
    );
  }

  // Validate times
  if (input.startTime >= input.endTime) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.INVALID_DATES),
      ERROR_CODES.INVALID_DATES,
      'Session start time must be before end time'
    );
  }

  // Validate timezone
  if (!isValidTimezone(input.timezone)) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.INVALID_TIMEZONE),
      ERROR_CODES.INVALID_TIMEZONE,
      `Invalid timezone: ${input.timezone}`
    );
  }

  // Convert times to UTC
  const startTimeUtc = convertUserTimezoneToUTC(input.startTime, input.timezone);
  const endTimeUtc = convertUserTimezoneToUTC(input.endTime, input.timezone);

  // Create session
  const result = await db
    .insert(sessions)
    .values({
      offeringId,
      teacherId,
      startTimeUtc,
      endTimeUtc,
    })
    .returning();

  return {
    id: result[0].id,
    offeringId: result[0].offeringId,
    startTimeUtc: result[0].startTimeUtc,
    endTimeUtc: result[0].endTimeUtc,
    createdAt: result[0].createdAt,
  };
}

/**
 * Get all offerings for a teacher
 */
export async function getTeacherOfferings(teacherId: number): Promise<any[]> {
  const teacherOfferings = await db.query.offerings.findMany({
    where: eq(offerings.teacherId, teacherId),
    with: {
      course: true,
      sessions: true,
      bookings: true,
    },
  });

  return teacherOfferings.map((offering) => ({
    id: offering.id,
    courseId: offering.courseId,
    courseName: offering.course.name,
    name: offering.name,
    teacherTimezone: offering.teacherTimezone,
    maxCapacity: offering.maxCapacity,
    currentBookings: offering.bookings.length,
    price: offering.price,
    sessions: offering.sessions.map((s) => ({
      id: s.id,
      startTimeUtc: s.startTimeUtc,
      endTimeUtc: s.endTimeUtc,
    })),
    createdAt: offering.createdAt,
  }));
}

/**
 * Get all available offerings (for parent view)
 */
export async function getAvailableOfferings(parentTimezone?: string): Promise<any[]> {
  const allOfferings = await db.query.offerings.findMany({
    with: {
      course: true,
      teacher: true,
      sessions: true,
      bookings: true,
    },
  });

  return allOfferings.map((offering) => ({
    id: offering.id,
    courseId: offering.courseId,
    courseName: offering.course.name,
    offeringName: offering.name,
    teacher: {
      id: offering.teacher.id,
      name: offering.teacher.name,
      email: offering.teacher.email,
      timezone: offering.teacher.timezone,
    },
    teacherTimezone: offering.teacherTimezone,
    maxCapacity: offering.maxCapacity,
    currentBookings: offering.bookings.length,
    spotsAvailable: offering.maxCapacity - offering.bookings.length,
    price: offering.price,
    sessions: offering.sessions.map((s) => ({
      id: s.id,
      startTimeUtc: s.startTimeUtc,
      endTimeUtc: s.endTimeUtc,
    })),
    createdAt: offering.createdAt,
  }));
}

/**
 * Get a single offering details
 */
export async function getOfferingDetails(offeringId: number): Promise<any> {
  const offering = await db.query.offerings.findFirst({
    where: eq(offerings.id, offeringId),
    with: {
      course: true,
      teacher: true,
      sessions: true,
      bookings: true,
    },
  });

  if (!offering) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.OFFERING_NOT_FOUND),
      ERROR_CODES.OFFERING_NOT_FOUND,
      `Offering with ID ${offeringId} not found`
    );
  }

  return {
    id: offering.id,
    courseId: offering.courseId,
    courseName: offering.course.name,
    offeringName: offering.name,
    teacher: {
      id: offering.teacher.id,
      name: offering.teacher.name,
      email: offering.teacher.email,
      timezone: offering.teacher.timezone,
    },
    teacherTimezone: offering.teacherTimezone,
    maxCapacity: offering.maxCapacity,
    currentBookings: offering.bookings.length,
    spotsAvailable: offering.maxCapacity - offering.bookings.length,
    price: offering.price,
    sessions: offering.sessions.map((s) => ({
      id: s.id,
      startTimeUtc: s.startTimeUtc,
      endTimeUtc: s.endTimeUtc,
    })),
    createdAt: offering.createdAt,
  };
}
