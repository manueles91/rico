import { query, queryOne } from '@/lib/db';

/**
 * Access control utilities for database operations
 */

export interface AccountAccessResult {
  hasAccess: boolean;
  role: string | null;
  accountId?: string;
}

/**
 * Check if a user has access to an account and return their role
 * @param accountId The ID of the account to check
 * @param userId The ID of the user
 * @returns Object with hasAccess and role properties
 */
export async function checkAccountAccess(
  accountId: string, 
  userId: string
): Promise<AccountAccessResult> {
  const result = await queryOne<{ role: string }>(
    `SELECT role 
     FROM account_members 
     WHERE account_id = $1 AND user_id = $2`,
    [accountId, userId]
  );
  
  return {
    hasAccess: !!result,
    role: result?.role || null,
    accountId
  };
}

/**
 * Check if a user has access to a specific entity through its account
 * @param tableName The name of the table containing the entity
 * @param entityId The ID of the entity to check
 * @param userId The ID of the user
 * @param accountIdColumn The column name containing the account ID (default: 'account_id')
 * @returns Object with hasAccess, role, and accountId properties
 */
export async function checkEntityAccess(
  tableName: string,
  entityId: string,
  userId: string,
  accountIdColumn: string = 'account_id'
): Promise<AccountAccessResult> {
  // Get the account ID for the entity
  const entity = await queryOne<{ [key: string]: string }>(
    `SELECT ${accountIdColumn} FROM ${tableName} WHERE id = $1`,
    [entityId]
  );
  
  if (!entity) {
    return { hasAccess: false, role: null };
  }
  
  const accountId = entity[accountIdColumn];
  
  // Check if the user has access to the account
  return await checkAccountAccess(accountId, userId);
}
