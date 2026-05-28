import { NextRequest, NextResponse } from 'next/server';
import { db, courses, users } from '@/db';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, ERROR_CODES, getHttpStatusCode } from '@/lib/api-response';

/**
 * POST /api/courses
 * Create a new course (teachers only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacherId, name, description } = body;

    // Validate inputs
    if (!teacherId || !name) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.INVALID_INPUT,
          'Missing required fields: teacherId, name'
        ),
        { status: getHttpStatusCode(ERROR_CODES.INVALID_INPUT) }
      );
    }

    // Verify teacher exists
    const teacher = await db.query.users.findFirst({
      where: eq(users.id, teacherId),
    });

    if (!teacher) {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.USER_NOT_FOUND,
          `Teacher with ID ${teacherId} not found`
        ),
        { status: getHttpStatusCode(ERROR_CODES.USER_NOT_FOUND) }
      );
    }

    if (teacher.role !== 'teacher') {
      return NextResponse.json(
        errorResponse(
          ERROR_CODES.TEACHER_ONLY,
          'Only teachers can create courses'
        ),
        { status: getHttpStatusCode(ERROR_CODES.TEACHER_ONLY) }
      );
    }

    // Create course
    const result = await db
      .insert(courses)
      .values({
        teacherId,
        name,
        description: description || null,
      })
      .returning();

    return NextResponse.json(
      successResponse({
        id: result[0].id,
        teacherId: result[0].teacherId,
        name: result[0].name,
        description: result[0].description,
        createdAt: result[0].createdAt,
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating course:', error);
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
 * GET /api/courses
 * Get courses (optionally filtered by teacher)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');

    let query = db.query.courses.findMany({
      with: {
        teacher: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (teacherId) {
      query = db.query.courses.findMany({
        where: eq(courses.teacherId, parseInt(teacherId)),
        with: {
          teacher: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    const allCourses = await query;

    return NextResponse.json(
      successResponse(
        allCourses.map((course) => ({
          id: course.id,
          teacherId: course.teacherId,
          teacher: course.teacher,
          name: course.name,
          description: course.description,
          createdAt: course.createdAt,
        }))
      )
    );
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    );
  }
}
