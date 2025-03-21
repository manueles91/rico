import { query, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  createdResponse,
  errorResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import { stackServerApp } from '@/stack';
import { getCurrentUser } from '@/lib/auth';

export interface Account {
  id: string;
  name: string;
  description: string | null;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountWithMembers extends Account {
  members: {
    user_id: string;
    email: string;
    name: string;
    role: string;
  }[];
}

// GET /api/accounts - Get all accounts (optionally for a specific user)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // Get the current authenticated user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      console.error('Authentication failed: No user found in Stack Auth');
      return errorResponse('User not authenticated', 401);
    }
    
    console.log('GET /api/accounts - Stack Auth user:', {
      id: stackUser.id,
      email: stackUser.primaryEmail,
      name: stackUser.displayName
    });
    
    // Directly check if the user exists in the database
    const userExists = await queryOne(
      'SELECT id FROM users WHERE id = $1',
      [stackUser.id]
    );
    
    // If user doesn't exist in database, create them
    if (!userExists) {
      console.log('User not found in database, creating user and personal account...');
      
      try {
        // Create user and personal account in a transaction
        const result = await transaction(async (client) => {
          // Create the user
          const userResult = await client.query(
            `INSERT INTO users (id, email, name, avatar_url) 
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
              stackUser.id,
              stackUser.primaryEmail || '',
              stackUser.displayName || null,
              stackUser.profileImageUrl || null
            ]
          );
          
          const user = userResult.rows[0];
          
          // Check if the user already has a personal account in the system
          // This can happen if the user was created in a different session
          const existingAccountCheck = await client.query(
            `SELECT a.* FROM accounts a
             JOIN account_members am ON a.id = am.account_id
             WHERE am.user_id = $1 AND a.is_personal = true
             LIMIT 1`,
            [stackUser.id]
          );
          
          if (existingAccountCheck.rows.length > 0) {
            console.log('Found existing personal account for user:', {
              accountId: existingAccountCheck.rows[0].id
            });
            
            return { user, account: existingAccountCheck.rows[0] };
          }
          
          // Create personal account
          const accountResult = await client.query(
            `INSERT INTO accounts (name, description, is_personal)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [
              `${user.name || 'Personal'}'s Account`,
              'Your personal account',
              true
            ]
          );
          
          const account = accountResult.rows[0];
          
          // Add user as owner of the account
          await client.query(
            `INSERT INTO account_members (account_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [account.id, user.id, 'owner']
          );
          
          return { user, account };
        });
        
        console.log('Successfully created user and personal account:', {
          userId: result.user.id,
          accountId: result.account.id
        });
        
        // Return the newly created account
        return successResponse([{
          ...result.account,
          members: [{
            user_id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: 'owner'
          }]
        }]);
      } catch (createError) {
        console.error('Error creating user and personal account:', createError);
        return errorResponse('Failed to create user and personal account', 500);
      }
    }
    
    // If user exists, get their accounts
    const effectiveUserId = userId || stackUser.id;
    
    // If the requested userId is different from the current user's ID,
    // check if the current user has permission to view other users' accounts
    if (userId && userId !== stackUser.id) {
      // For now, only allow users to view their own accounts
      console.error(`Access denied: User ${stackUser.id} tried to access accounts for user ${userId}`);
      return errorResponse('You do not have permission to view other users\' accounts', 403);
    }
    
    try {
      // Get accounts for a specific user with member details
      const accounts = await query<AccountWithMembers>(
        `SELECT 
           a.*, 
           json_agg(
             json_build_object(
               'user_id', am.user_id,
               'email', u.email,
               'name', u.name,
               'role', am.role
             )
           ) as members
         FROM accounts a
         JOIN account_members am ON a.id = am.account_id
         JOIN users u ON am.user_id = u.id
         WHERE am.user_id = $1
         GROUP BY a.id
         ORDER BY a.is_personal DESC, a.created_at ASC`,
        [effectiveUserId]
      );
      
      if (!accounts || accounts.length === 0) {
        console.log('No accounts found for user, checking if user has a personal account in the system...');
        
        try {
          // First check if the user already has a personal account in the system
          // This handles the case where a user signs in from a different device
          const existingPersonalAccount = await queryOne<Account>(
            `SELECT a.* FROM accounts a
             JOIN account_members am ON a.id = am.account_id
             WHERE am.user_id = $1 AND a.is_personal = true
             LIMIT 1`,
            [stackUser.id]
          );
          
          if (existingPersonalAccount) {
            console.log('Found existing personal account for user:', {
              accountId: existingPersonalAccount.id
            });
            
            // Get the user details to include in the response
            const userDetails = await queryOne(
              'SELECT email, name FROM users WHERE id = $1',
              [stackUser.id]
            );
            
            // Return the existing personal account
            return successResponse([{
              ...existingPersonalAccount,
              members: [{
                user_id: stackUser.id,
                email: userDetails?.email || stackUser.primaryEmail || '',
                name: userDetails?.name || stackUser.displayName || null,
                role: 'owner'
              }]
            }]);
          }
          
          // Check for any accounts (not just personal) that might be associated with this user
          // This is a more thorough check that looks for any account membership
          const anyExistingAccount = await queryOne<Account>(
            `SELECT a.* FROM accounts a
             JOIN account_members am ON a.id = am.account_id
             WHERE am.user_id = $1
             LIMIT 1`,
            [stackUser.id]
          );
          
          if (anyExistingAccount) {
            console.log('Found existing account (not personal) for user:', {
              accountId: anyExistingAccount.id
            });
            
            // Get the user details to include in the response
            const userDetails = await queryOne(
              'SELECT email, name FROM users WHERE id = $1',
              [stackUser.id]
            );
            
            // Get all members of this account
            const members = await query(
              `SELECT 
                 am.user_id,
                 u.email,
                 u.name,
                 am.role
               FROM account_members am
               JOIN users u ON am.user_id = u.id
               WHERE am.account_id = $1`,
              [anyExistingAccount.id]
            );
            
            // Return the existing account
            return successResponse([{
              ...anyExistingAccount,
              members
            }]);
          }
          
          // If no personal account exists, create one
          console.log('No personal account found, creating new personal account...');
          
          // Create personal account in a transaction
          const result = await transaction(async (client) => {
            // Create personal account
            const accountResult = await client.query(
              `INSERT INTO accounts (name, description, is_personal)
               VALUES ($1, $2, $3)
               RETURNING *`,
              [
                `${stackUser.displayName || 'Personal'}'s Account`,
                'Your personal account',
                true
              ]
            );
            
            const account = accountResult.rows[0];
            
            // Add user as owner of the account
            await client.query(
              `INSERT INTO account_members (account_id, user_id, role)
               VALUES ($1, $2, $3)`,
              [account.id, stackUser.id, 'owner']
            );
            
            return account;
          });
          
          console.log('Successfully created personal account:', {
            accountId: result.id
          });
          
          // Return the newly created account
          return successResponse([{
            ...result,
            members: [{
              user_id: stackUser.id,
              email: stackUser.primaryEmail || '',
              name: stackUser.displayName || null,
              role: 'owner'
            }]
          }]);
        } catch (createError) {
          console.error('Error creating personal account:', createError);
          return errorResponse('Failed to create personal account', 500);
        }
      }
      
      return successResponse(accounts);
    } catch (error) {
      console.error('Database error when fetching accounts:', error);
      return errorResponse('Failed to fetch accounts', 500);
    }
  } catch (error) {
    console.error('Error in GET /api/accounts:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    // Get the user
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return errorResponse('User not authenticated', 401);
    }
    
    // Get the request body
    const body = await request.json();
    
    // Validate request body
    if (!body.name) {
      return errorResponse('Account name is required', 400);
    }
    
    try {
      // Create the account
      const result = await transaction(async (client) => {
        // Create the account
        const accountResult = await client.query(
          `INSERT INTO accounts (name, description, is_personal)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [body.name, body.description || null, body.isPersonal !== false]
        );
        
        const account = accountResult.rows[0];
        
        // Add the current user as an owner
        await client.query(
          `INSERT INTO account_members (account_id, user_id, role)
           VALUES ($1, $2, $3)`,
          [account.id, stackUser.id, 'owner']
        );
        
        // Process invitations for shared accounts
        if (!body.isPersonal && body.invitedEmails && Array.isArray(body.invitedEmails) && body.invitedEmails.length > 0) {
          // Generate a random token for each invitation
          for (const email of body.invitedEmails) {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            // Create invitation record
            await client.query(
              `INSERT INTO invitations (account_id, email, role, token, invited_by, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                account.id, 
                email, 
                'editor', // Default role for invited members
                token,
                stackUser.id,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
              ]
            );
            
            // TODO: Send invitation email
            console.log(`Invitation created for ${email} to join account ${account.id}`);
          }
        }
        
        return account;
      });
      
      return createdResponse(result);
    } catch (error) {
      console.error('Database error when creating account:', error);
      return errorResponse('Failed to create account', 500);
    }
  } catch (error) {
    console.error('Error in POST /api/accounts:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
