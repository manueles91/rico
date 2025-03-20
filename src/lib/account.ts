import { query, queryOne, transaction } from './db';
import { Account, accountSchema } from '@/db/schema';

/**
 * Creates a personal account for a user if they don't have one
 * @param userId The ID of the user
 * @param userName The name of the user (for the account name)
 * @returns The created or existing personal account
 */
export async function ensurePersonalAccount(userId: string, userName: string): Promise<Account> {
  try {
    // Check if the user already has a personal account
    const existingAccount = await queryOne<Account>(
      `SELECT a.* FROM accounts a
       JOIN account_members am ON a.id = am.account_id
       WHERE am.user_id = $1 AND a.is_personal = true
       LIMIT 1`,
      [userId],
      { useAuthenticated: true }
    );
    
    if (existingAccount) {
      console.log('Found existing personal account:', existingAccount.id);
      return accountSchema.parse(existingAccount);
    }
    
    console.log('No personal account found, creating new one for user:', userId);
    
    // Create a new personal account for the user
    const result = await transaction(async (client) => {
      // Create the account
      const accountResult = await client.query(
        `INSERT INTO accounts (name, description, is_personal)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [`${userName}'s Personal Account`, 'Your personal budget account', true]
      );
      
      const account = accountResult.rows[0];
      
      // Add the user as an owner
      await client.query(
        `INSERT INTO account_members (account_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [account.id, userId, 'owner']
      );
      
      return account;
    }, { useAuthenticated: true }); // Use authenticated transaction
    
    return accountSchema.parse(result);
  } catch (error) {
    console.error('Error creating personal account:', error);
    throw error;
  }
}

/**
 * Gets all accounts for a user
 * @param userId The ID of the user
 * @returns An array of accounts the user has access to
 */
export async function getUserAccounts(userId: string): Promise<Account[]> {
  try {
    const accounts = await query<Account>(
      `SELECT a.* FROM accounts a
       JOIN account_members am ON a.id = am.account_id
       WHERE am.user_id = $1
       ORDER BY a.is_personal DESC, a.name ASC`,
      [userId],
      { useAuthenticated: true }
    );
    
    return accounts.map(account => accountSchema.parse(account));
  } catch (error) {
    console.error('Error getting user accounts:', error);
    throw error;
  }
}

/**
 * Gets a specific account by ID, ensuring the user has access
 * @param accountId The ID of the account
 * @param userId The ID of the user
 * @returns The account if the user has access, null otherwise
 */
export async function getUserAccount(accountId: string, userId: string): Promise<Account | null> {
  try {
    const account = await queryOne<Account>(
      `SELECT a.* FROM accounts a
       JOIN account_members am ON a.id = am.account_id
       WHERE a.id = $1 AND am.user_id = $2
       LIMIT 1`,
      [accountId, userId],
      { useAuthenticated: true }
    );
    
    return account ? accountSchema.parse(account) : null;
  } catch (error) {
    console.error('Error getting user account:', error);
    throw error;
  }
}
