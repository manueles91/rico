import { NextRequest } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import { successResponse, createdResponse, errorResponse } from '@/lib/api-utils';
import { stackServerApp } from '@/stack';
import { nanoid } from 'nanoid';

// POST /api/accounts/[accountId]/share - Generate a shareable link for an account
export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    
    // Get the current authenticated user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return errorResponse('User not authenticated', 401);
    }
    
    // Check if the account exists and the user has access to it
    const accountMember = await queryOne(
      `SELECT am.role, a.is_personal 
       FROM account_members am
       JOIN accounts a ON am.account_id = a.id
       WHERE am.account_id = $1 AND am.user_id = $2`,
      [accountId, stackUser.id]
    );
    
    if (!accountMember) {
      return errorResponse('Account not found or you do not have access to it', 404);
    }
    
    // Check if the account is shared (not personal)
    if (accountMember.is_personal) {
      return errorResponse('Cannot generate shareable link for personal accounts', 400);
    }
    
    // Generate a unique token for the shareable link
    const token = nanoid(16);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days
    
    // Create or update the shareable link in the database
    const result = await transaction(async (client) => {
      // Check if a shareable link already exists for this account
      const existingLink = await client.query(
        'SELECT id FROM shareable_links WHERE account_id = $1',
        [accountId]
      );
      
      if (existingLink.rows.length > 0) {
        // Update the existing link
        await client.query(
          `UPDATE shareable_links 
           SET token = $1, created_by = $2, expires_at = $3, updated_at = NOW()
           WHERE account_id = $4
           RETURNING *`,
          [token, stackUser.id, expiresAt, accountId]
        );
      } else {
        // Create a new shareable link
        await client.query(
          `INSERT INTO shareable_links (account_id, token, created_by, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [accountId, token, stackUser.id, expiresAt]
        );
      }
      
      return { token };
    });
    
    // Construct the shareable link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareLink = `${baseUrl}/join?token=${result.token}&accountId=${accountId}`;
    
    return successResponse({ shareLink });
  } catch (error) {
    console.error('Error generating shareable link:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
