import { NextRequest, NextResponse } from 'next/server';
import { bookOffering, getParentBookings, cancelBooking, checkBookingConflicts } from '@/lib/services/booking';
import { successResponse, errorResponse, ERROR_CODES, getHttpStatusCode, ApiError } from '@/lib/api-response';

/**
 * POST /api/bookings
 * Book an offering (parents only)
 * Handles concurrent requests with proper conflict detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentId, offeringId } = body;

    // Validate inputs
    if (!parentId || !offeringId) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Missing required fields: parentId, offeringId'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    const booking = await bookOffering(parentId, offeringId);

    return NextResponse.json(successResponse(booking), { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      );
    }

    console.error('Error booking offering:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings
 * Get bookings (parent's bookings or check for conflicts)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get('parentId');
    const checkConflicts = searchParams.get('checkConflicts');
    const offeringId = searchParams.get('offeringId');

    // Check for conflicts
    if (checkConflicts === 'true' && parentId && offeringId) {
      const conflicts = await checkBookingConflicts(
        parseInt(parentId),
        parseInt(offeringId)
      );

      return NextResponse.json(
        successResponse({
          hasConflicts: conflicts.length > 0,
          conflicts,
        })
      );
    }

    // Get parent's bookings
    if (parentId) {
      const bookings = await getParentBookings(parseInt(parentId));
      return NextResponse.json(successResponse(bookings));
    }

    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INVALID_INPUT,
        'parentId parameter is required'
      ),
      { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      );
    }

    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/:id
 * Cancel a booking
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('id');
    const parentId = searchParams.get('parentId');

    if (!bookingId || !parentId) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Missing required fields: id (bookingId), parentId'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    await cancelBooking(parseInt(bookingId), parseInt(parentId));

    return NextResponse.json(
      successResponse({
        message: 'Booking cancelled successfully',
      })
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      );
    }

    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}
