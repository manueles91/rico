import { query, queryOne } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Account utilities for budget operations
 */

export interface AccountBalance {
  currentBalance: number;
  income: number;
  expenses: number;
  recentTransactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }[];
}

/**
 * Get account balance and transaction history
 * @param accountId The ID of the account
 * @param userId Optional user ID to check access
 * @returns Account balance information and recent transactions
 */
export async function getAccountBalance(
  accountId: string,
  userId?: string
): Promise<AccountBalance> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get income total
  const incomeResult = await queryOne<{ total: string }>(
    `SELECT SUM(amount) as total
     FROM income
     WHERE account_id = $1`,
    [accountId]
  );
  
  // Get expense total
  const expenseResult = await queryOne<{ total: string }>(
    `SELECT SUM(amount) as total
     FROM expenses
     WHERE account_id = $1`,
    [accountId]
  );
  
  const income = parseFloat(incomeResult?.total || '0');
  const expenses = parseFloat(expenseResult?.total || '0');
  const currentBalance = income - expenses;
  
  // Get recent transactions (both income and expenses)
  const recentTransactions = await query<{
    id: string;
    date: string;
    description: string;
    amount: string;
    type: 'income' | 'expense';
  }>(
    `SELECT 
       id,
       date,
       description,
       amount,
       'income' as type
     FROM income
     WHERE account_id = $1
     
     UNION ALL
     
     SELECT 
       id,
       date,
       description,
       amount,
       'expense' as type
     FROM expenses
     WHERE account_id = $1
     
     ORDER BY date DESC
     LIMIT 10`,
    [accountId]
  );
  
  // Format transactions
  const formattedTransactions = recentTransactions.map(t => ({
    id: t.id,
    date: t.date,
    description: t.description,
    amount: parseFloat(t.amount),
    type: t.type
  }));
  
  return {
    currentBalance,
    income,
    expenses,
    recentTransactions: formattedTransactions
  };
}

/**
 * Get account overview with summary statistics
 * @param accountId The ID of the account
 * @param userId Optional user ID to check access
 * @returns Overview of the account with key metrics
 */
export async function getAccountOverview(
  accountId: string,
  userId?: string
): Promise<{
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topCategories: { name: string; amount: number }[];
}> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get current month's date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  // Get monthly income
  const incomeResult = await queryOne<{ total: string }>(
    `SELECT SUM(amount) as total
     FROM income
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, startOfMonth, endOfMonth]
  );
  
  // Get monthly expenses
  const expenseResult = await queryOne<{ total: string }>(
    `SELECT SUM(amount) as total
     FROM expenses
     WHERE account_id = $1
     AND date BETWEEN $2 AND $3`,
    [accountId, startOfMonth, endOfMonth]
  );
  
  // Get top expense categories for the month
  const topCategories = await query<{ name: string; amount: string }>(
    `SELECT 
       c.name,
       SUM(e.amount) as amount
     FROM categories c
     JOIN expense_categories ec ON c.id = ec.category_id
     JOIN expenses e ON ec.expense_id = e.id
     WHERE e.account_id = $1
     AND e.date BETWEEN $2 AND $3
     GROUP BY c.name
     ORDER BY amount DESC
     LIMIT 5`,
    [accountId, startOfMonth, endOfMonth]
  );
  
  // Get total balance
  const { currentBalance } = await getAccountBalance(accountId, userId);
  
  const monthlyIncome = parseFloat(incomeResult?.total || '0');
  const monthlyExpenses = parseFloat(expenseResult?.total || '0');
  
  // Calculate savings rate
  const savingsRate = monthlyIncome > 0 
    ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
    : 0;
  
  return {
    balance: currentBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    topCategories: topCategories.map(c => ({
      name: c.name,
      amount: parseFloat(c.amount)
    }))
  };
}
