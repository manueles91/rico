'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@stackframe/stack';
import { User } from '@/db/schema';

/**
 * Hook to get the current user with database information
 * @returns The current user and loading state
 */
export function useCurrentUser() {
  const stackUser = useUser({ or: 'return-null' });
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchUser() {
      if (!stackUser) {
        if (isMounted) {
          setDbUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        console.log('Fetching user data for:', stackUser.id);
        
        // First, test the database connection
        const dbTestResponse = await fetch('/api/test-db');
        const dbTestData = await dbTestResponse.json();
        
        if (!dbTestResponse.ok) {
          console.error('Database connection test failed:', dbTestData);
          throw new Error(`Database connection failed: ${dbTestData.message || 'Unknown error'}`);
        }
        
        console.log('Database connection test:', dbTestData);
        
        // Then, test the auth configuration
        const authTestResponse = await fetch('/api/test-auth');
        const authTestData = await authTestResponse.json();
        
        if (!authTestResponse.ok) {
          console.error('Auth configuration test failed:', authTestData);
          throw new Error(`Auth configuration failed: ${authTestData.message || 'Unknown error'}`);
        }
        
        console.log('Auth configuration test:', authTestData);
        
        // Now try to fetch the user data
        const response = await fetch('/api/auth/user', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('User API response error:', errorData);
          throw new Error(errorData.message || 'Failed to fetch user data');
        }
        
        const data = await response.json();
        console.log('User API response:', data);
        
        if (isMounted) {
          if (data.authenticated && data.user) {
            // Transform property names to match our schema
            const formattedUser: User = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              avatar_url: data.user.avatar_url,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at
            };
            setDbUser(formattedUser);
          } else {
            // If the API returns not authenticated, we'll still use the Stack Auth user
            // but without database-specific fields
            setDbUser({
              id: stackUser.id,
              email: stackUser.primaryEmail || '',
              name: stackUser.displayName || null,
              avatar_url: stackUser.profileImageUrl || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          
          // Fallback to Stack Auth user
          setDbUser({
            id: stackUser.id,
            email: stackUser.primaryEmail || '',
            name: stackUser.displayName || null,
            avatar_url: stackUser.profileImageUrl || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    setIsLoading(true);
    fetchUser();
    
    return () => {
      isMounted = false;
    };
  }, [stackUser]);

  return {
    user: dbUser,
    isLoading,
    error,
    isAuthenticated: !!dbUser,
    // Include the Stack Auth user for access to auth-specific methods
    stackUser
  };
}
