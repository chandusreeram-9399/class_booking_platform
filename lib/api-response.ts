export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create a successful response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Common error codes
 */
export const ERROR_CODES = {
  // Validation errors (400)
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_TIMEZONE: 'INVALID_TIMEZONE',
  INVALID_DATES: 'INVALID_DATES',
  INVALID_USER_ROLE: 'INVALID_USER_ROLE',

  // Authentication/Authorization errors (401/403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TEACHER_ONLY: 'TEACHER_ONLY',
  PARENT_ONLY: 'PARENT_ONLY',

  // Resource not found (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  OFFERING_NOT_FOUND: 'OFFERING_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  OFFERING_FULL: 'OFFERING_FULL',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  DUPLICATE_BOOKING: 'DUPLICATE_BOOKING',
  TIME_OVERLAP: 'TIME_OVERLAP',

  // Concurrency errors (409)
  CONCURRENT_BOOKING_ATTEMPT: 'CONCURRENT_BOOKING_ATTEMPT',
  RACE_CONDITION: 'RACE_CONDITION',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
};

/**
 * Map error codes to HTTP status codes
 */
export function getHttpStatusCode(code: string): number {
  const statusMap: Record<string, number> = {
    [ERROR_CODES.INVALID_INPUT]: 400,
    [ERROR_CODES.INVALID_TIMEZONE]: 400,
    [ERROR_CODES.INVALID_DATES]: 400,
    [ERROR_CODES.INVALID_USER_ROLE]: 400,
    [ERROR_CODES.UNAUTHORIZED]: 401,
    [ERROR_CODES.FORBIDDEN]: 403,
    [ERROR_CODES.TEACHER_ONLY]: 403,
    [ERROR_CODES.PARENT_ONLY]: 403,
    [ERROR_CODES.NOT_FOUND]: 404,
    [ERROR_CODES.USER_NOT_FOUND]: 404,
    [ERROR_CODES.COURSE_NOT_FOUND]: 404,
    [ERROR_CODES.OFFERING_NOT_FOUND]: 404,
    [ERROR_CODES.SESSION_NOT_FOUND]: 404,
    [ERROR_CODES.BOOKING_NOT_FOUND]: 404,
    [ERROR_CODES.CONFLICT]: 409,
    [ERROR_CODES.OFFERING_FULL]: 409,
    [ERROR_CODES.BOOKING_CONFLICT]: 409,
    [ERROR_CODES.DUPLICATE_BOOKING]: 409,
    [ERROR_CODES.TIME_OVERLAP]: 409,
    [ERROR_CODES.CONCURRENT_BOOKING_ATTEMPT]: 409,
    [ERROR_CODES.RACE_CONDITION]: 409,
    [ERROR_CODES.INTERNAL_ERROR]: 500,
    [ERROR_CODES.DATABASE_ERROR]: 500,
  };

  return statusMap[code] || 500;
}
