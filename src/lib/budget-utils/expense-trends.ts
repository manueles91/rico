import { query } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Expense trends utilities for budget operations
 */

export interface ExpenseTrend {
  period: string;
  amount: number;
  count: number;
}

/**
 * Get expense trends for an account
 * @param accountId The ID of the account
 * @param months Number of months to include in the trends (default: 6)
 * @param userId Optional user ID to check access
 * @returns Array of expense trends by month
 */
export async function getExpenseTrends(
  accountId: string,
  months: number = 6,
  userId?: string
): Promise<ExpenseTrend[]> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Calculate date range
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  
  // Get trends by month
  const trends = await query<{
    month: string;
    year: string;
    amount: string;
    count: string;
  }>(
    `SELECT 
       EXTRACT(MONTH FROM date) as month,
       EXTRACT(YEAR FROM date) as year,
       SUM(amount) as amount,
       COUNT(*) as count
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3
     GROUP BY year, month
     ORDER BY year, month`,
    [
      accountId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]
  );
  
  // Format the results
  return trends.map(t => {
    const month = parseInt(t.month);
    const year = parseInt(t.year);
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
    
    return {
      period: `${monthName} ${year}`,
      amount: parseFloat(t.amount),
      count: parseInt(t.count)
    };
  });
}

/**
 * Get expense trends by category
 * @param accountId The ID of the account
 * @param months Number of months to include in the trends (default: 6)
 * @param userId Optional user ID to check access
 * @returns Array of expense trends by category and month
 */
export async function getExpenseTrendsByCategory(
  accountId: string,
  months: number = 6,
  userId?: string
): Promise<{
  categories: string[];
  trends: {
    period: string;
    values: Record<string, number>;
  }[];
}> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Calculate date range
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  
  // Get all categories for the account
  const categories = await query<{ id: string; name: string }>(
    `SELECT id, name FROM categories WHERE account_id = $1 ORDER BY name`,
    [accountId]
  );
  
  // Get trends by category and month
  const trends = await query<{
    month: string;
    year: string;
    category_id: string;
    category_name: string;
    amount: string;
  }>(
    `SELECT 
       EXTRACT(MONTH FROM e.date) as month,
       EXTRACT(YEAR FROM e.date) as year,
       c.id as category_id,
       c.name as category_name,
       SUM(e.amount) as amount
     FROM expenses e
     JOIN expense_categories ec ON e.id = ec.expense_id
     JOIN categories c ON ec.category_id = c.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $2 AND $3
     GROUP BY year, month, c.id, c.name
     ORDER BY year, month, c.name`,
    [
      accountId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]
  );
  
  // Create a map of year-month to category amounts
  const periodMap: Record<string, Record<string, number>> = {};
  
  for (const trend of trends) {
    const month = parseInt(trend.month);
    const year = parseInt(trend.year);
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
    const period = `${monthName} ${year}`;
    
    if (!periodMap[period]) {
      periodMap[period] = {};
    }
    
    periodMap[period][trend.category_name] = parseFloat(trend.amount);
  }
  
  // Convert to array format
  const categoryNames = categories.map(c => c.name);
  const result = Object.entries(periodMap).map(([period, values]) => ({
    period,
    values
  }));
  
  // Sort by period
  result.sort((a, b) => {
    const [aMonth, aYear] = a.period.split(' ');
    const [bMonth, bYear] = b.period.split(' ');
    
    if (aYear !== bYear) {
      return parseInt(aYear) - parseInt(bYear);
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(aMonth) - months.indexOf(bMonth);
  });
  
  return {
    categories: categoryNames,
    trends: result
  };
}
