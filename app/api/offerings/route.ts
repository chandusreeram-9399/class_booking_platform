import { NextRequest, NextResponse } from 'next/server';
import {
  createOffering,
  getTeacherOfferings,
  getAvailableOfferings,
  getOfferingDetails,
} from '@/lib/services/offering';
import { successResponse, errorResponse, ERROR_CODES, getHttpStatusCode, ApiError } from '@/lib/api-response';

/**
 * POST /api/offerings
 * Create a new offering (teachers only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, courseId, name, teacherTimezone, maxCapacity, price } = body;

    // Validate inputs
    if (!teacherId || !courseId || !name || !teacherTimezone || price === undefined) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Missing required fields: teacherId, courseId, name, teacherTimezone, price'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Price must be non-negative'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    const offering = await createOffering(teacherId, {
      courseId,
      name,
      teacherTimezone,
      maxCapacity,
      price,
    });

    return NextResponse.json(successResponse(offering), { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      );
    }

    console.error('Error creating offering:', error);
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
 * GET /api/offerings
 * Get offerings (all, teacher's, or specific offering details)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const offeringId = searchParams.get('id');
    const parentTimezone = searchParams.get('timezone');

    // Get specific offering
    if (offeringId) {
      const offering = await getOfferingDetails(parseInt(offeringId));
      return NextResponse.json(successResponse(offering));
    }

    // Get teacher's offerings
    if (teacherId) {
      const offerings = await getTeacherOfferings(parseInt(teacherId));
      return NextResponse.json(successResponse(offerings));
    }

    // Get all available offerings
    const offerings = await getAvailableOfferings(parentTimezone || undefined);
    return NextResponse.json(successResponse(offerings));
  } catch (error: any) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        errorResponse(error.code, error.message, error.details),
        { status: error.statusCode }
      );
    }

    console.error('Error fetching offerings:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}
