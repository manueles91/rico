import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

// GET /api/accounts/[accountId]/validate-share - Validate a shareable link
export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return errorResponse('Token is required', 400);
    }
    
    // Check if the shareable link exists and is valid
    const shareableLink = await queryOne(
      `SELECT sl.*, a.name as account_name
       FROM shareable_links sl
       JOIN accounts a ON sl.account_id = a.id
       WHERE sl.account_id = $1 AND sl.token = $2 AND sl.expires_at > NOW()`,
      [accountId, token]
    );
    
    if (!shareableLink) {
      return errorResponse('Invalid or expired invitation link', 404);
    }
    
    return successResponse({
      accountId: shareableLink.account_id,
      accountName: shareableLink.account_name,
      isValid: true,
    });
  } catch (error) {
    console.error('Error validating shareable link:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
