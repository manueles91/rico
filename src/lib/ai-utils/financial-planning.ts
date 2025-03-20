import { query, queryOne } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';

/**
 * Financial planning utilities for AI operations
 */

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  progress: number;
  monthly_contribution: number;
}

export interface FinancialProjection {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
}

/**
 * Get savings goals for an account
 * @param accountId The ID of the account
 * @param userId Optional user ID to check access
 * @returns Array of savings goals with progress
 */
export async function getSavingsGoals(
  accountId: string,
  userId?: string
): Promise<SavingsGoal[]> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get savings goals
  const goals = await query<{
    id: string;
    name: string;
    target_amount: string;
    current_amount: string;
    target_date: string;
  }>(
    `SELECT 
       id,
       name,
       target_amount,
       current_amount,
       target_date
     FROM savings_goals
     WHERE account_id = $1
     ORDER BY target_date ASC`,
    [accountId]
  );
  
  // Calculate progress and monthly contribution
  return goals.map(goal => {
    const targetAmount = parseFloat(goal.target_amount);
    const currentAmount = parseFloat(goal.current_amount);
    const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    
    // Calculate months remaining
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    const monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + 
                            (targetDate.getMonth() - now.getMonth());
    
    // Calculate required monthly contribution
    const amountRemaining = targetAmount - currentAmount;
    const monthlyContribution = monthsRemaining > 0 ? amountRemaining / monthsRemaining : amountRemaining;
    
    return {
      id: goal.id,
      name: goal.name,
      target_amount: targetAmount,
      current_amount: currentAmount,
      target_date: goal.target_date,
      progress,
      monthly_contribution: Math.max(0, monthlyContribution)
    };
  });
}

/**
 * Get financial projections for an account
 * @param accountId The ID of the account
 * @param months Number of months to project (default: 12)
 * @param userId Optional user ID to check access
 * @returns Array of monthly financial projections
 */
export async function getFinancialProjections(
  accountId: string,
  months: number = 12,
  userId?: string
): Promise<FinancialProjection[]> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Get average monthly income
  const avgIncome = await queryOne<{ average: string }>(
    `SELECT AVG(amount) as average
     FROM income
     WHERE account_id = $1
     AND date >= NOW() - INTERVAL '6 months'`,
    [accountId]
  );
  
  // Get average monthly expenses
  const avgExpenses = await queryOne<{ average: string }>(
    `SELECT AVG(amount) as average
     FROM expenses
     WHERE account_id = $1
     AND date >= NOW() - INTERVAL '6 months'`,
    [accountId]
  );
  
  // Get current account balance
  const currentBalance = await queryOne<{ balance: string }>(
    `SELECT 
       (SELECT COALESCE(SUM(amount), 0) FROM income WHERE account_id = $1) -
       (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE account_id = $1) as balance`,
    [accountId]
  );
  
  // Calculate monthly averages
  const monthlyIncome = parseFloat(avgIncome?.average || '0');
  const monthlyExpenses = parseFloat(avgExpenses?.average || '0');
  const monthlySavings = monthlyIncome - monthlyExpenses;
  let runningBalance = parseFloat(currentBalance?.balance || '0');
  
  // Generate projections
  const projections: FinancialProjection[] = [];
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const projectionDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = projectionDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    runningBalance += monthlySavings;
    
    projections.push({
      month,
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings: monthlySavings,
      balance: runningBalance
    });
  }
  
  return projections;
}

/**
 * Get conversation history with context for AI
 * @param conversationId The ID of the conversation
 * @param limit Maximum number of messages to retrieve (default: 20)
 * @param userId Optional user ID to check access
 * @returns Conversation with messages and context
 */
export async function getConversationWithContext(
  conversationId: string,
  limit: number = 20,
  userId?: string
): Promise<{
  conversation: { id: string; account_id: string };
  messages: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender_name: string;
  }[];
  context: {
    account: {
      id: string;
      name: string;
      members: { user_id: string; name: string; email: string; role: string }[];
      summary: { currentMonthExpenses: number; expenseCount: number; categoryCount: number };
    };
    recentExpenses: { id: string; date: string; amount: number; categories: string[] }[];
  };
}> {
  // Get conversation details
  const conversation = await queryOne<{ id: string; account_id: string }>(
    `SELECT id, account_id FROM conversations WHERE id = $1`,
    [conversationId]
  );
  
  if (!conversation) {
    throw new Error('Conversation not found');
  }
  
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(conversation.account_id, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this conversation');
    }
  }
  
  // Get conversation messages
  const messages = await query<{
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender_name: string;
  }>(
    `SELECT 
       m.*,
       u.name as sender_name
     FROM messages m
     LEFT JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [conversationId, limit.toString()]
  );
  
  // Get account context
  const accountContext = await getAccountOverview(conversation.account_id);
  
  // Get recent expenses
  const recentExpenses = await getRecentExpenses(conversation.account_id, 5);
  
  return {
    conversation,
    messages,
    context: {
      account: accountContext,
      recentExpenses
    }
  };
}

/**
 * Get account overview with members and summary
 * This is a helper function for getConversationWithContext
 */
async function getAccountOverview(accountId: string) {
  // Get account details with members
  const account = await queryOne<{
    id: string;
    name: string;
    members: { user_id: string; name: string; email: string; role: string }[];
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
  const summary = {
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
 * Get recent expenses with categories for an account
 * This is a helper function for getConversationWithContext
 */
async function getRecentExpenses(accountId: string, limit: number = 5) {
  // Get recent expenses with categories
  return await query<{
    id: string;
    date: string;
    amount: number;
    categories: string[];
  }>(
    `SELECT 
       e.id,
       e.date,
       e.amount,
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
