import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, unauthorizedResponse } from '@/lib/api-utils';

// GET /api/users/me - Get the current authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return unauthorizedResponse('User not authenticated');
    }
    
    return successResponse(user);
  } catch (error: any) {
    return unauthorizedResponse(`Authentication error: ${error.message}`);
  }
}

export const dynamic = 'force-dynamic';
