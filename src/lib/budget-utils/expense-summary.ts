import { query, queryOne } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Expense summary utilities for budget operations
 */

export interface ExpenseSummary {
  total: number;
  average: number;
  count: number;
  byCategory: {
    name: string;
    color: string;
    amount: number;
    percentage: number;
  }[];
}

/**
 * Get expense summary for an account within a date range
 * @param accountId The ID of the account
 * @param startDate Start date for the summary (YYYY-MM-DD)
 * @param endDate End date for the summary (YYYY-MM-DD)
 * @param userId Optional user ID to check access
 * @returns Summary of expenses including total, average, count, and breakdown by category
 */
export async function getExpenseSummary(
  accountId: string,
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<ExpenseSummary> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Set default date range if not provided
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const start = startDate || defaultStartDate;
  const end = endDate || defaultEndDate;
  
  // Get overall summary
  const summary = await queryOne<{
    total: string;
    average: string;
    count: string;
  }>(
    `SELECT 
       SUM(amount) as total,
       AVG(amount) as average,
       COUNT(*) as count
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, start, end]
  );
  
  // Get breakdown by category
  const byCategory = await query<{
    name: string;
    color: string;
    amount: string;
  }>(
    `SELECT 
       c.name,
       c.color,
       SUM(e.amount) as amount
     FROM expenses e
     JOIN expense_categories ec ON e.id = ec.expense_id
     JOIN categories c ON ec.category_id = c.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $2 AND $3
     GROUP BY c.id
     ORDER BY amount DESC`,
    [accountId, start, end]
  );
  
  // Calculate total for percentage calculation
  const total = parseFloat(summary?.total || '0');
  
  // Add percentage to each category
  const categoriesWithPercentage = byCategory.map(cat => ({
    name: cat.name,
    color: cat.color,
    amount: parseFloat(cat.amount),
    percentage: total > 0 ? (parseFloat(cat.amount) / total) * 100 : 0
  }));
  
  return {
    total: total,
    average: parseFloat(summary?.average || '0'),
    count: parseInt(summary?.count || '0'),
    byCategory: categoriesWithPercentage
  };
}

/**
 * Get expense statistics for an account
 * @param accountId The ID of the account
 * @param startDate Start date for the statistics (YYYY-MM-DD)
 * @param endDate End date for the statistics (YYYY-MM-DD)
 * @param userId Optional user ID to check access
 * @returns Statistics including total, average, min, max, and count
 */
export async function getExpenseStatistics(
  accountId: string,
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<{
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
}> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Set default date range if not provided
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const start = startDate || defaultStartDate;
  const end = endDate || defaultEndDate;
  
  // Get statistics
  const stats = await queryOne<{
    total: string;
    average: string;
    min: string;
    max: string;
    count: string;
  }>(
    `SELECT 
       SUM(amount) as total,
       AVG(amount) as average,
       MIN(amount) as min,
       MAX(amount) as max,
       COUNT(*) as count
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, start, end]
  );
  
  return {
    total: parseFloat(stats?.total || '0'),
    average: parseFloat(stats?.average || '0'),
    min: parseFloat(stats?.min || '0'),
    max: parseFloat(stats?.max || '0'),
    count: parseInt(stats?.count || '0')
  };
}
