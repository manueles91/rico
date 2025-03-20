import { query, queryOne } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Budget analysis utilities for AI operations
 */

export interface BudgetPerformance {
  category: string;
  budgeted: number;
  actual: number;
  difference: number;
  percentUsed: number;
}

export interface BudgetAnalysis {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentUsed: number;
  categories: BudgetPerformance[];
  overBudgetCategories: BudgetPerformance[];
}

/**
 * Get budget performance analysis for an account
 * @param accountId The ID of the account
 * @param month Month to analyze (1-12, default: current month)
 * @param year Year to analyze (default: current year)
 * @param userId Optional user ID to check access
 * @returns Budget analysis with category breakdown
 */
export async function getBudgetAnalysis(
  accountId: string,
  month?: number,
  year?: number,
  userId?: string
): Promise<BudgetAnalysis> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Set default month and year if not provided
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();
  
  // Calculate date range
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0);
  
  // Format dates
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Get budget totals
  const budgetTotals = await queryOne<{
    total_budget: string;
    total_spent: string;
  }>(
    `SELECT 
       SUM(b.amount) as total_budget,
       COALESCE(
         (SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.account_id = $1
          AND e.date BETWEEN $2 AND $3),
         0
       ) as total_spent
     FROM budgets b
     WHERE b.account_id = $1
     AND b.month = $4
     AND b.year = $5`,
    [accountId, startDateStr, endDateStr, targetMonth, targetYear]
  );
  
  // Get budget performance by category
  const categoryPerformance = await query<{
    category: string;
    budgeted: string;
    actual: string;
  }>(
    `SELECT 
       c.name as category,
       b.amount as budgeted,
       COALESCE(
         (SELECT SUM(e.amount)
          FROM expenses e
          JOIN expense_categories ec ON e.id = ec.expense_id
          WHERE e.account_id = $1
          AND e.date BETWEEN $2 AND $3
          AND ec.category_id = c.id),
         0
       ) as actual
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     WHERE b.account_id = $1
     AND b.month = $4
     AND b.year = $5
     ORDER BY b.amount DESC`,
    [accountId, startDateStr, endDateStr, targetMonth, targetYear]
  );
  
  // Calculate values
  const totalBudget = parseFloat(budgetTotals?.total_budget || '0');
  const totalSpent = parseFloat(budgetTotals?.total_spent || '0');
  const remainingBudget = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Format category performance
  const categories = categoryPerformance.map(cat => {
    const budgeted = parseFloat(cat.budgeted);
    const actual = parseFloat(cat.actual);
    const difference = budgeted - actual;
    const percentUsed = budgeted > 0 ? (actual / budgeted) * 100 : 0;
    
    return {
      category: cat.category,
      budgeted,
      actual,
      difference,
      percentUsed
    };
  });
  
  // Find over-budget categories
  const overBudgetCategories = categories.filter(cat => cat.actual > cat.budgeted);
  
  return {
    totalBudget,
    totalSpent,
    remainingBudget,
    percentUsed,
    categories,
    overBudgetCategories
  };
}

/**
 * Get spending anomalies for AI insights
 * @param accountId The ID of the account
 * @param threshold Threshold percentage for anomaly detection (default: 50)
 * @param userId Optional user ID to check access
 * @returns Array of spending anomalies
 */
export async function getSpendingAnomalies(
  accountId: string,
  threshold: number = 50,
  userId?: string
): Promise<{
  category: string;
  averageSpend: number;
  currentSpend: number;
  percentChange: number;
  isIncrease: boolean;
}[]> {
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
  
  // Previous 3 months
  const previousMonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const previousMonthsEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Format dates
  const currentStartStr = currentMonthStart.toISOString().split('T')[0];
  const currentEndStr = currentMonthEnd.toISOString().split('T')[0];
  const previousStartStr = previousMonthsStart.toISOString().split('T')[0];
  const previousEndStr = previousMonthsEnd.toISOString().split('T')[0];
  
  // Get spending anomalies
  const anomalies = await query<{
    category: string;
    average_spend: string;
    current_spend: string;
  }>(
    `WITH previous_spending AS (
       SELECT 
         c.id as category_id,
         c.name as category,
         SUM(e.amount) / 3 as average_spend
       FROM categories c
       JOIN expense_categories ec ON c.id = ec.category_id
       JOIN expenses e ON ec.expense_id = e.id
       WHERE e.account_id = $1
       AND e.date BETWEEN $2 AND $3
       GROUP BY c.id
     ),
     current_spending AS (
       SELECT 
         c.id as category_id,
         SUM(e.amount) as current_spend
       FROM categories c
       JOIN expense_categories ec ON c.id = ec.category_id
       JOIN expenses e ON ec.expense_id = e.id
       WHERE e.account_id = $1
       AND e.date BETWEEN $4 AND $5
       GROUP BY c.id
     )
     SELECT 
       p.category,
       p.average_spend,
       COALESCE(c.current_spend, 0) as current_spend
     FROM previous_spending p
     LEFT JOIN current_spending c ON p.category_id = c.category_id
     WHERE 
       p.average_spend > 0
       AND ABS(COALESCE(c.current_spend, 0) - p.average_spend) / p.average_spend * 100 >= $6
     ORDER BY ABS(COALESCE(c.current_spend, 0) - p.average_spend) / p.average_spend DESC`,
    [accountId, previousStartStr, previousEndStr, currentStartStr, currentEndStr, threshold]
  );
  
  // Format anomalies
  return anomalies.map(a => {
    const averageSpend = parseFloat(a.average_spend);
    const currentSpend = parseFloat(a.current_spend);
    const percentChange = ((currentSpend - averageSpend) / averageSpend) * 100;
    
    return {
      category: a.category,
      averageSpend,
      currentSpend,
      percentChange,
      isIncrease: currentSpend > averageSpend
    };
  });
}
