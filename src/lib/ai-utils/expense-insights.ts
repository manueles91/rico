import { query, queryOne } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Expense insights utilities for AI operations
 */

export interface ExpenseWithCategories {
  id: string;
  date: string;
  amount: number;
  description: string;
  categories: string[];
}

export interface CategoryInsight {
  name: string;
  color: string;
  total: number;
  count: number;
}

export interface CategoryComparison {
  name: string;
  current_month: number;
  previous_month: number;
  difference: number;
}

export interface ExpenseInsights {
  currentMonth: { 
    total: number; 
    startDate: string; 
    endDate: string 
  };
  previousMonth: { 
    total: number; 
    startDate: string; 
    endDate: string 
  };
  change: { 
    amount: number; 
    percentage: number 
  };
  topCategories: CategoryInsight[];
  categoryComparison: CategoryComparison[];
}

/**
 * Get recent expenses with categories for an account
 * @param accountId The ID of the account
 * @param limit Number of recent expenses to retrieve (default: 10)
 * @param userId Optional user ID to check access
 * @returns Array of recent expenses with their categories
 */
export async function getRecentExpenses(
  accountId: string,
  limit: number = 10,
  userId?: string
): Promise<ExpenseWithCategories[]> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get recent expenses with categories
  return await query<ExpenseWithCategories>(
    `SELECT 
       e.id,
       e.date,
       e.amount,
       e.description,
       COALESCE(
         array_agg(c.name) FILTER (WHERE c.name IS NOT NULL),
         ARRAY[]::text[]
       ) as categories
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.id = ec.expense_id
     LEFT JOIN categories c ON ec.category_id = c.id
     WHERE e.account_id = $1
     GROUP BY e.id
     ORDER BY e.date DESC
     LIMIT $2`,
    [accountId, limit.toString()]
  );
}

/**
 * Search for expenses by natural language query
 * @param accountId The ID of the account
 * @param queryText Natural language query text
 * @param userId Optional user ID to check access
 * @returns Array of expenses matching the query
 */
export async function searchExpensesByNaturalLanguage(
  accountId: string,
  queryText: string,
  userId?: string
): Promise<ExpenseWithCategories[]> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Parse the query text to extract potential filters
  const dateRegex = /(?:from|between|since|after|before)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gi;
  const amountRegex = /(?:more than|less than|over|under|above|below|at least|at most)\s+\$?(\d+(?:\.\d{2})?)/gi;
  const categoryRegex = /(?:category|categories|in|for)\s+(['"]?)([a-zA-Z\s]+)\1/gi;
  
  let startDate: string | undefined;
  let endDate: string | undefined;
  let minAmount: number | undefined;
  let maxAmount: number | undefined;
  let categories: string[] = [];
  
  // Extract dates
  const dateMatches = Array.from(queryText.matchAll(dateRegex));
  for (const match of dateMatches) {
    const dateStr = match[1];
    // Parse the date (simplified for example)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      if (!startDate) {
        startDate = date.toISOString().split('T')[0];
      } else if (!endDate) {
        endDate = date.toISOString().split('T')[0];
      }
    }
  }
  
  // Extract amounts
  const amountMatches = Array.from(queryText.matchAll(amountRegex));
  for (const match of amountMatches) {
    const amountStr = match[0];
    const amount = parseFloat(match[1]);
    
    if (!isNaN(amount)) {
      if (amountStr.includes('more than') || amountStr.includes('over') || 
          amountStr.includes('above') || amountStr.includes('at least')) {
        minAmount = amount;
      } else if (amountStr.includes('less than') || amountStr.includes('under') || 
                 amountStr.includes('below') || amountStr.includes('at most')) {
        maxAmount = amount;
      }
    }
  }
  
  // Extract categories
  const categoryMatches = Array.from(queryText.matchAll(categoryRegex));
  for (const match of categoryMatches) {
    categories.push(match[2].trim());
  }
  
  // Build the query
  let whereConditions = ['e.account_id = $1'];
  let params: (string | number | string[])[] = [accountId];
  let paramIndex = 2;
  
  // Add date filters
  if (startDate) {
    whereConditions.push(`e.date >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    whereConditions.push(`e.date <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }
  
  // Add amount filters
  if (minAmount !== undefined) {
    whereConditions.push(`e.amount >= $${paramIndex}`);
    params.push(minAmount.toString());
    paramIndex++;
  }
  
  if (maxAmount !== undefined) {
    whereConditions.push(`e.amount <= $${paramIndex}`);
    params.push(maxAmount.toString());
    paramIndex++;
  }
  
  // Add category filter
  let categoryJoin = '';
  if (categories.length > 0) {
    categoryJoin = `
      JOIN expense_categories ec ON e.id = ec.expense_id
      JOIN categories c ON ec.category_id = c.id AND c.name = ANY($${paramIndex})
    `;
    params.push(categories.join(','));
    paramIndex++;
  }
  
  // Add full-text search
  whereConditions.push(`e.description ILIKE $${paramIndex}`);
  params.push(`%${queryText}%`);
  
  // Execute the query
  return await query<ExpenseWithCategories>(
    `SELECT 
       e.id,
       e.date,
       e.amount,
       e.description,
       COALESCE(
         array_agg(c.name) FILTER (WHERE c.name IS NOT NULL),
         ARRAY[]::text[]
       ) as categories
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.id = ec.expense_id
     LEFT JOIN categories c ON ec.category_id = c.id
     ${categoryJoin}
     WHERE ${whereConditions.join(' AND ')}
     GROUP BY e.id
     ORDER BY e.date DESC
     LIMIT 20`,
    params
  );
}

/**
 * Get expense summary for AI insights
 * @param accountId The ID of the account
 * @param userId Optional user ID to check access
 * @returns Expense insights including month-over-month comparison
 */
export async function getExpenseInsights(
  accountId: string,
  userId?: string
): Promise<ExpenseInsights> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Calculate date ranges
  const now = new Date();
  
  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Previous month
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Format dates
  const currentStartStr = currentMonthStart.toISOString().split('T')[0];
  const currentEndStr = currentMonthEnd.toISOString().split('T')[0];
  const previousStartStr = previousMonthStart.toISOString().split('T')[0];
  const previousEndStr = previousMonthEnd.toISOString().split('T')[0];
  
  // Get current month total
  const currentMonthTotal = await queryOne<{ total: string }>(
    `SELECT SUM(amount) as total
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, currentStartStr, currentEndStr]
  );
  
  // Get previous month total
  const previousMonthTotal = await queryOne<{ total: string }>(
    `SELECT SUM(amount) as total
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, previousStartStr, previousEndStr]
  );
  
  // Get top categories for current month
  const topCategories = await query<{
    name: string;
    color: string;
    total: string;
    count: string;
  }>(
    `SELECT 
       c.name,
       c.color,
       SUM(e.amount) as total,
       COUNT(e.id) as count
     FROM categories c
     JOIN expense_categories ec ON c.id = ec.category_id
     JOIN expenses e ON ec.expense_id = e.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $2 AND $3
     GROUP BY c.id
     ORDER BY total DESC
     LIMIT 5`,
    [accountId, currentStartStr, currentEndStr]
  );
  
  // Get category comparison
  const categoryComparison = await query<{
    name: string;
    current_month: string;
    previous_month: string;
  }>(
    `SELECT 
       c.name,
       SUM(CASE WHEN e.date BETWEEN $2 AND $3 THEN e.amount ELSE 0 END) as current_month,
       SUM(CASE WHEN e.date BETWEEN $4 AND $5 THEN e.amount ELSE 0 END) as previous_month
     FROM categories c
     JOIN expense_categories ec ON c.id = ec.category_id
     JOIN expenses e ON ec.expense_id = e.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $4 AND $3
     GROUP BY c.id
     ORDER BY current_month DESC
     LIMIT 10`,
    [accountId, currentStartStr, currentEndStr, previousStartStr, previousEndStr]
  );
  
  // Calculate values
  const currentTotal = parseFloat(currentMonthTotal?.total || '0');
  const previousTotal = parseFloat(previousMonthTotal?.total || '0');
  const changeAmount = currentTotal - previousTotal;
  const changePercentage = previousTotal > 0 
    ? (changeAmount / previousTotal) * 100 
    : 0;
  
  return {
    currentMonth: {
      total: currentTotal,
      startDate: currentStartStr,
      endDate: currentEndStr
    },
    previousMonth: {
      total: previousTotal,
      startDate: previousStartStr,
      endDate: previousEndStr
    },
    change: {
      amount: changeAmount,
      percentage: changePercentage
    },
    topCategories: topCategories.map(cat => ({
      name: cat.name,
      color: cat.color,
      total: parseFloat(cat.total),
      count: parseInt(cat.count)
    })),
    categoryComparison: categoryComparison.map(cat => ({
      name: cat.name,
      current_month: parseFloat(cat.current_month),
      previous_month: parseFloat(cat.previous_month),
      difference: parseFloat(cat.current_month) - parseFloat(cat.previous_month)
    }))
  };
}
