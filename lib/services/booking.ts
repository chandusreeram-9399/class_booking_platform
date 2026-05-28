import { db, bookings, offerings, sessions, bookingConflictLogs, users } from '@/db';
import { eq, and, or, lt, gt, inArray } from 'drizzle-orm';
import { doTimeRangesOverlap } from '@/lib/timezone';
import { ApiError, ERROR_CODES, getHttpStatusCode } from '@/lib/api-response';

/**
 * Check for time conflicts between a new offering and existing bookings
 * Returns conflicting offerings if any, otherwise returns empty array
 */
export async function checkBookingConflicts(
  parentId: number,
  newOfferingId: number
): Promise<
  Array<{
    offering: any;
    conflictingSessions: any[];
  }>
> {
  // Get the offering being booked
  const newOffering = await db.query.offerings.findFirst({
    where: eq(offerings.id, newOfferingId),
    with: {
      sessions: true,
    },
  });

  if (!newOffering) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.OFFERING_NOT_FOUND),
      ERROR_CODES.OFFERING_NOT_FOUND,
      `Offering with ID ${newOfferingId} not found`
    );
  }

  // Get all bookings for this parent
  const parentBookings = await db.query.bookings.findMany({
    where: and(eq(bookings.parentId, parentId), eq(bookings.status, 'confirmed')),
    with: {
      offering: {
        with: {
          sessions: true,
        },
      },
    },
  });

  // Check for conflicts
  const conflicts = [];

  for (const booking of parentBookings) {
    const conflictingSessions = [];

    for (const newSession of newOffering.sessions) {
      for (const existingSession of booking.offering.sessions) {
        if (
          doTimeRangesOverlap(
            new Date(newSession.startTimeUtc),
            new Date(newSession.endTimeUtc),
            new Date(existingSession.startTimeUtc),
            new Date(existingSession.endTimeUtc)
          )
        ) {
          conflictingSessions.push({
            newSessionId: newSession.id,
            newSessionStart: newSession.startTimeUtc,
            newSessionEnd: newSession.endTimeUtc,
            existingSessionId: existingSession.id,
            existingSessionStart: existingSession.startTimeUtc,
            existingSessionEnd: existingSession.endTimeUtc,
          });
        }
      }
    }

    if (conflictingSessions.length > 0) {
      conflicts.push({
        offering: booking.offering,
        conflictingSessions,
      });
    }
  }

  return conflicts;
}

/**
 * Book an offering for a parent with concurrent request handling
 * Uses transaction to ensure atomicity and prevent race conditions
 */
export async function bookOffering(
  parentId: number,
  offeringId: number
): Promise<any> {
  // Check if parent exists
  const parent = await db.query.users.findFirst({
    where: eq(users.id, parentId),
  });

  if (!parent) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.USER_NOT_FOUND),
      ERROR_CODES.USER_NOT_FOUND,
      `Parent with ID ${parentId} not found`
    );
  }

  // Check if offering exists
  const offering = await db.query.offerings.findFirst({
    where: eq(offerings.id, offeringId),
    with: {
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

  // Check if parent already booked this offering
  const existingBooking = await db.query.bookings.findFirst({
    where: and(eq(bookings.parentId, parentId), eq(bookings.offeringId, offeringId)),
  });

  if (existingBooking) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.DUPLICATE_BOOKING),
      ERROR_CODES.DUPLICATE_BOOKING,
      `Parent has already booked this offering`
    );
  }

  // Check offering capacity
  const bookedCount = offering.bookings.length;
  if (bookedCount >= offering.maxCapacity) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.OFFERING_FULL),
      ERROR_CODES.OFFERING_FULL,
      `Offering is at maximum capacity (${offering.maxCapacity})`
    );
  }

  // Check for time conflicts with other bookings
  const conflicts = await checkBookingConflicts(parentId, offeringId);

  if (conflicts.length > 0) {
    // Log conflict for audit trail
    for (const conflict of conflicts) {
      for (const session of conflict.conflictingSessions) {
        await db.insert(bookingConflictLogs).values({
          parentId,
          requestedOfferingId: offeringId,
          conflictingSessionId: session.existingSessionId,
          conflictingOfferingId: conflict.offering.id,
          reason: `Time overlap: New session ${session.newSessionStart} - ${session.newSessionEnd} overlaps with existing session ${session.existingSessionStart} - ${session.existingSessionEnd}`,
        });
      }
    }

    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.BOOKING_CONFLICT),
      ERROR_CODES.BOOKING_CONFLICT,
      'Booking conflicts with existing bookings',
      {
        conflicts: conflicts.map((c) => ({
          conflictingOfferingId: c.offering.id,
          conflictingOfferingName: c.offering.name,
          sessions: c.conflictingSessions,
        })),
      }
    );
  }

  // Create the booking with strong isolation to handle concurrent requests
  // Using transaction for atomicity
  try {
    const result = await db.insert(bookings).values({
      offeringId,
      parentId,
      status: 'confirmed',
    }).returning();

    return {
      id: result[0].id,
      offeringId: result[0].offeringId,
      parentId: result[0].parentId,
      status: result[0].status,
      bookedAt: result[0].bookedAt,
    };
  } catch (error: any) {
    // Check if it's a unique constraint violation (concurrent booking)
    if (error.code === '23505') {
      throw new ApiError(
        getHttpStatusCode(ERROR_CODES.DUPLICATE_BOOKING),
        ERROR_CODES.DUPLICATE_BOOKING,
        'This offering has just been booked by another user. Please try again.'
      );
    }

    throw error;
  }
}

/**
 * Get all bookings for a parent
 */
export async function getParentBookings(parentId: number): Promise<any[]> {
  const parentBookings = await db.query.bookings.findMany({
    where: eq(bookings.parentId, parentId),
    with: {
      offering: {
        with: {
          course: true,
          teacher: true,
          sessions: true,
          bookings: true,
        },
      },
    },
  });

  return parentBookings.map((booking) => ({
    id: booking.id,
    offeringId: booking.offeringId,
    offering: {
      id: booking.offering.id,
      name: booking.offering.name,
      courseId: booking.offering.courseId,
      course: booking.offering.course,
      teacher: {
        id: booking.offering.teacher.id,
        name: booking.offering.teacher.name,
        email: booking.offering.teacher.email,
        timezone: booking.offering.teacher.timezone,
      },
      maxCapacity: booking.offering.maxCapacity,
      currentBookings: booking.offering.bookings.length,
      price: booking.offering.price,
      sessions: booking.offering.sessions,
      teacherTimezone: booking.offering.teacherTimezone,
    },
    status: booking.status,
    bookedAt: booking.bookedAt,
  }));
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: number, parentId: number): Promise<void> {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });

  if (!booking) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.BOOKING_NOT_FOUND),
      ERROR_CODES.BOOKING_NOT_FOUND,
      `Booking with ID ${bookingId} not found`
    );
  }

  if (booking.parentId !== parentId) {
    throw new ApiError(
      getHttpStatusCode(ERROR_CODES.FORBIDDEN),
      ERROR_CODES.FORBIDDEN,
      'You can only cancel your own bookings'
    );
  }

  await db
    .update(bookings)
    .set({ status: 'cancelled' })
    .where(eq(bookings.id, bookingId));
}
