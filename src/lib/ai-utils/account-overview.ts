import { query, queryOne } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils/access';

/**
 * Account overview utilities for AI operations
 */

export interface AccountMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface AccountSummary {
  currentMonthExpenses: number;
  expenseCount: number;
  categoryCount: number;
}

export interface AccountOverview {
  id: string;
  name: string;
  members: AccountMember[];
  summary: AccountSummary;
}

/**
 * Get account overview with members and summary
 * @param accountId The ID of the account
 * @param userId Optional user ID to check access
 * @returns Account overview with members and summary statistics
 */
export async function getAccountOverview(
  accountId: string,
  userId?: string
): Promise<AccountOverview> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get account details with members
  const account = await queryOne<{
    id: string;
    name: string;
    members: AccountMember[];
  }>(
    `SELECT 
       a.*,
       json_agg(
         json_build_object(
           'user_id', u.id,
           'name', u.name,
           'email', u.email,
           'role', am.role
         )
       ) as members
     FROM accounts a
     JOIN account_members am ON a.id = am.account_id
     JOIN users u ON am.user_id = u.id
     WHERE a.id = $1
     GROUP BY a.id`,
    [accountId]
  );
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  // Get current month's date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  // Get current month's expenses
  const expenseSummary = await queryOne<{
    total: string;
    count: string;
  }>(
    `SELECT 
       SUM(amount) as total,
       COUNT(*) as count
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, startOfMonth, endOfMonth]
  );
  
  // Get category count
  const categoryCount = await queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT c.id) as count
     FROM categories c
     JOIN expense_categories ec ON c.id = ec.category_id
     JOIN expenses e ON ec.expense_id = e.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $2 AND $3`,
    [accountId, startOfMonth, endOfMonth]
  );
  
  // Build the summary
  const summary: AccountSummary = {
    currentMonthExpenses: parseFloat(expenseSummary?.total || '0'),
    expenseCount: parseInt(expenseSummary?.count || '0'),
    categoryCount: parseInt(categoryCount?.count || '0')
  };
  
  return {
    ...account,
    summary
  };
}

/**
 * Get account activity summary for AI insights
 * @param accountId The ID of the account
 * @param userId Optional user ID to check access
 * @returns Account activity summary
 */
export async function getAccountActivity(
  accountId: string,
  userId?: string
): Promise<{
  recentActivity: {
    type: string;
    user_name: string;
    action: string;
    timestamp: string;
  }[];
  activeUsers: {
    user_id: string;
    name: string;
    activity_count: number;
  }[];
}> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get recent activity
  const recentActivity = await query<{
    type: string;
    user_name: string;
    action: string;
    timestamp: string;
  }>(
    `SELECT 
       'expense' as type,
       u.name as user_name,
       'added expense' as action,
       e.created_at as timestamp
     FROM expenses e
     JOIN users u ON e.created_by = u.id
     WHERE e.account_id = $1
     
     UNION ALL
     
     SELECT 
       'income' as type,
       u.name as user_name,
       'added income' as action,
       i.created_at as timestamp
     FROM income i
     JOIN users u ON i.created_by = u.id
     WHERE i.account_id = $1
     
     ORDER BY timestamp DESC
     LIMIT 10`,
    [accountId]
  );
  
  // Get active users
  const activeUsers = await query<{
    user_id: string;
    name: string;
    activity_count: string;
  }>(
    `SELECT 
       u.id as user_id,
       u.name,
       COUNT(*) as activity_count
     FROM (
       SELECT created_by, created_at FROM expenses WHERE account_id = $1
       UNION ALL
       SELECT created_by, created_at FROM income WHERE account_id = $1
     ) activity
     JOIN users u ON activity.created_by = u.id
     WHERE activity.created_at > NOW() - INTERVAL '30 days'
     GROUP BY u.id
     ORDER BY activity_count DESC`,
    [accountId]
  );
  
  return {
    recentActivity,
    activeUsers: activeUsers.map(user => ({
      user_id: user.user_id,
      name: user.name,
      activity_count: parseInt(user.activity_count)
    }))
  };
}
