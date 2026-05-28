import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/db';
import { successResponse, errorResponse, ERROR_CODES, getHttpStatusCode, ApiError } from '@/lib/api-response';
import { isValidTimezone } from '@/lib/timezone';

/**
 * POST /api/users
 * Create a new user (teacher or parent)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role, timezone } = body;

    // Validate inputs
    if (!email || !name || !role) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Missing required fields: email, name, role'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    if (!['teacher', 'parent'].includes(role)) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_USER_ROLE,
          'Role must be either "teacher" or "parent"'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_USER_ROLE) }
      );
    }

    if (!timezone || !isValidTimezone(timezone)) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_TIMEZONE,
          `Invalid timezone: ${timezone}`
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_TIMEZONE) }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users_table, { eq }) => eq(users_table.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.CONFLICT,
          `User with email ${email} already exists`
        ),
        { status: getHttpStatusCode(ERROR_CODES.CONFLICT) }
      );
    }

    // Create user
    const result = await db
      .insert(users)
      .values({
        email,
        name,
        role,
        timezone,
      })
      .returning();

    return NextResponse.json(
      successResponse({
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        role: result[0].role,
        timezone: result[0].timezone,
        createdAt: result[0].createdAt,
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
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
 * GET /api/users/:id
 * Get user details
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'User ID is required'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    const user = await db.query.users.findFirst({
      where: (users_table, { eq }) => eq(users_table.id, parseInt(id)),
    });

    if (!user) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.USER_NOT_FOUND,
          `User with ID ${id} not found`
        ),
        { status: getHttpStatusCode(ERROR_CODES.USER_NOT_FOUND) }
      );
    }

    return NextResponse.json(
      successResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timezone: user.timezone,
        createdAt: user.createdAt,
      })
    );
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}
