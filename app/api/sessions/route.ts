import { NextRequest, NextResponse } from 'next/server';
import { addSessionToOffering } from '@/lib/services/offering';
import { successResponse, errorResponse, ERROR_CODES, getHttpStatusCode, ApiError } from '@/lib/api-response';

/**
 * POST /api/sessions
 * Add a session to an offering (teachers only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, offeringId, startTime, endTime, timezone } = body;

    // Validate inputs
    if (!teacherId || !offeringId || !startTime || !endTime || !timezone) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Missing required fields: teacherId, offeringId, startTime, endTime, timezone'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    // Parse dates
    let startDate: Date;
    let endDate: Date;

    try {
      startDate = new Date(startTime);
      endDate = new Date(endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_DATES,
          'Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:00:00)'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_DATES) }
      );
    }

    const session = await addSessionToOffering(offeringId, teacherId, {
      startTime: startDate,
      endTime: endDate,
      timezone,
    });

    return NextResponse.json(successResponse(session), { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      );
    }

    console.error('Error creating session:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}
