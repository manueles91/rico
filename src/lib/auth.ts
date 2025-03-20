import { stackServerApp } from '@/stack';
import { queryOne } from './db';
import { userSchema, type User } from '@/db/schema';

/**
 * Get the current authenticated user with database information
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get the user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    
    if (!stackUser) {
      return null;
    }
    
    console.log('Stack Auth user:', {
      id: stackUser.id,
      email: stackUser.primaryEmail,
      name: stackUser.displayName
    });
    
    // Get the user from the database by ID to match RLS policies
    const dbUser = await queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [stackUser.id],
      { useAuthenticated: true }
    );
    
    if (!dbUser) {
      console.log('User not found in database, creating new user...');
      // Create the user in the database if they don't exist
      // This shouldn't happen because of the middleware, but just in case
      const newUser = await queryOne<User>(
        `INSERT INTO users (id, email, name, avatar_url) 
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          stackUser.id,
          stackUser.primaryEmail || '',
          stackUser.displayName || null,
          stackUser.profileImageUrl || null
        ],
        { useAuthenticated: true }
      );
      
      if (newUser) {
        console.log('New user created:', newUser.id);
        return userSchema.parse(newUser);
      } else {
        console.error('Failed to create new user in database');
        return null;
      }
    }
    
    // Validate the user data
    return userSchema.parse(dbUser);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current authenticated user with database information
 * If the user is not authenticated, redirect to the sign-in page
 * @param redirectTo The URL to redirect to after sign-in
 * @returns The current user
 */
export async function requireAuth(redirectTo?: string): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    const signInUrl = redirectTo 
      ? `/handler/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
      : '/handler/sign-in';
      
    throw new Error(`User not authenticated. Redirect to ${signInUrl}`);
  }
  
  return user;
}
