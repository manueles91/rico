import { query } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Category utilities for budget operations
 */

export interface CategoryDistribution {
  name: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

/**
 * Get category distribution for an account
 * @param accountId The ID of the account
 * @param startDate Start date for filtering (YYYY-MM-DD)
 * @param endDate End date for filtering (YYYY-MM-DD)
 * @param userId Optional user ID to check access
 * @returns Array of categories with their distribution data
 */
export async function getCategoryDistribution(
  accountId: string,
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<CategoryDistribution[]> {
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
  
  // Get category distribution
  const distribution = await query<{
    name: string;
    color: string;
    amount: string;
    count: string;
  }>(
    `SELECT 
       c.name,
       c.color,
       SUM(e.amount) as amount,
       COUNT(e.id) as count
     FROM categories c
     JOIN expense_categories ec ON c.id = ec.category_id
     JOIN expenses e ON ec.expense_id = e.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $2 AND $3
     GROUP BY c.id
     ORDER BY amount DESC`,
    [accountId, start, end]
  );
  
  // Calculate total for percentage
  const total = distribution.reduce(
    (sum, item) => sum + parseFloat(item.amount), 
    0
  );
  
  // Add percentage to each category
  return distribution.map(item => ({
    name: item.name,
    color: item.color,
    amount: parseFloat(item.amount),
    percentage: total > 0 ? (parseFloat(item.amount) / total) * 100 : 0,
    count: parseInt(item.count)
  }));
}

/**
 * Get category suggestions based on description
 * @param accountId The ID of the account
 * @param description The expense description to get suggestions for
 * @param limit Maximum number of suggestions to return (default: 3)
 * @returns Array of suggested category names
 */
export async function getCategorySuggestions(
  accountId: string,
  description: string,
  limit: number = 3
): Promise<string[]> {
  if (!description) {
    return [];
  }
  
  // Get categories that have been used for similar descriptions
  const suggestions = await query<{ name: string; count: string }>(
    `SELECT 
       c.name,
       COUNT(*) as count
     FROM categories c
     JOIN expense_categories ec ON c.id = ec.category_id
     JOIN expenses e ON ec.expense_id = e.id
     WHERE e.account_id = $1
     AND e.description ILIKE $2
     GROUP BY c.name
     ORDER BY count DESC
     LIMIT $3`,
    [accountId, `%${description}%`, limit]
  );
  
  return suggestions.map(s => s.name);
}
