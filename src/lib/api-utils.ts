import { NextResponse } from 'next/server';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Creates a standardized success response
 */
export function successResponse<T>(data: T, message = 'Success'): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: 200 }
  );
}

/**
 * Creates a standardized created response
 */
export function createdResponse<T>(data: T, message = 'Created'): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: 201 }
  );
}

/**
 * Creates a standardized error response
 */
export function errorResponse(
  error: string, 
  status = 400,
  additionalData: Record<string, any> = {}
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...additionalData,
    },
    { status }
  );
}

/**
 * Creates a not found response
 */
export function notFoundResponse(resource = 'Resource'): NextResponse<ApiResponse<null>> {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Creates a validation error response
 */
export function validationErrorResponse(
  errors: Record<string, string[]> | string[]
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation Error',
      errors,
    },
    { status: 422 }
  );
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse(
  message = 'Unauthorized access'
): NextResponse<ApiResponse<null>> {
  return errorResponse(message, 401);
}

/**
 * Creates a forbidden response
 */
export function forbiddenResponse(
  message = 'Forbidden access'
): NextResponse<ApiResponse<null>> {
  return errorResponse(message, 403);
}
