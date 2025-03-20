import { queryOne } from '@/lib/db';

/**
 * User profile utilities for AI operations
 */

export interface UserAccount {
  id: string;
  name: string;
  role: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  accounts: UserAccount[];
}

/**
 * Get a simplified user profile with account information
 * @param userId The ID of the user
 * @returns User profile with accounts and roles, or null if user not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return await queryOne<UserProfile>(
    `SELECT 
       u.*,
       json_agg(
         json_build_object(
           'id', a.id,
           'name', a.name,
           'role', am.role
         )
       ) as accounts
     FROM users u
     LEFT JOIN account_members am ON u.id = am.user_id
     LEFT JOIN accounts a ON am.account_id = a.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
}

/**
 * Get user preferences for AI personalization
 * @param userId The ID of the user
 * @returns User preferences for AI interactions, or null if preferences not found
 */
export async function getUserPreferences(
  userId: string
): Promise<{
  id: string;
  ai_language_style: string;
  ai_detail_level: string;
  preferred_categories: string[];
  notification_preferences: Record<string, boolean>;
} | null> {
  return await queryOne(
    `SELECT 
       up.*,
       COALESCE(
         array_agg(pc.category_name) FILTER (WHERE pc.category_name IS NOT NULL),
         ARRAY[]::text[]
       ) as preferred_categories
     FROM user_preferences up
     LEFT JOIN preferred_categories pc ON up.id = pc.user_preference_id
     WHERE up.user_id = $1
     GROUP BY up.id`,
    [userId]
  );
}
