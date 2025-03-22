import { query, queryOne } from '@/lib/db';
import { Conversation, AccountDetails, Expense, ExpenseData } from './types';

/**
 * Verifies if a user has access to a specific account
 */
export async function verifyAccountAccess(accountId: string, userId: string): Promise<boolean> {
  const accountAccess = await queryOne(
    `SELECT am.* 
     FROM account_members am
     WHERE am.account_id = $1 AND am.user_id = $2`,
    [accountId, userId],
    { useAuthenticated: true }
  );

  return !!accountAccess;
}

/**
 * Gets or creates a conversation for an account
 */
export async function getOrCreateConversation(accountId: string): Promise<Conversation> {
  let conversation = await queryOne(
    'SELECT * FROM conversations WHERE account_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [accountId],
    { useAuthenticated: true }
  );

  if (!conversation) {
    conversation = await queryOne(
      'INSERT INTO conversations (id, account_id, title, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING *',
      [accountId, 'New Conversation'],
      { useAuthenticated: true }
    );
  }

  return conversation;
}

/**
 * Gets account details including expense count
 */
export async function getAccountDetails(accountId: string): Promise<AccountDetails | null> {
  return await queryOne(
    'SELECT a.*, COUNT(e.id) as expense_count FROM accounts a LEFT JOIN expenses e ON a.id = e.account_id WHERE a.id = $1 GROUP BY a.id',
    [accountId],
    { useAuthenticated: true, useCache: true }
  );
}

/**
 * Gets recent expenses for an account
 */
export async function getRecentExpenses(accountId: string, limit = 5): Promise<any[]> {
  return await query(
    `SELECT e.*, array_agg(c.name) as categories
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.id = ec.expense_id
     LEFT JOIN categories c ON ec.category_id = c.id
     WHERE e.account_id = $1
     GROUP BY e.id
     ORDER BY e.date DESC
     LIMIT $2`,
    [accountId, limit],
    { useAuthenticated: true, useCache: true }
  );
}

/**
 * Saves a user message to the conversation
 */
export async function saveUserMessage(conversationId: string, userId: string, content: string): Promise<void> {
  await query(
    'INSERT INTO messages (id, conversation_id, user_id, content, is_from_ai, created_at) VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())',
    [conversationId, userId, content],
    { useAuthenticated: true }
  );
}

/**
 * Saves an AI response to the conversation
 */
export async function saveAIResponse(conversationId: string, content: string): Promise<void> {
  await query(
    'INSERT INTO messages (id, conversation_id, content, is_from_ai, created_at) VALUES (gen_random_uuid(), $1, $2, true, NOW())',
    [conversationId, content],
    { useAuthenticated: true }
  );
}

/**
 * Updates the conversation title or timestamp
 */
export async function updateConversation(
  conversation: Conversation, 
  userContent?: string
): Promise<void> {
  if (conversation.title === 'New Conversation' && userContent) {
    const title = userContent.length > 50 
      ? userContent.substring(0, 47) + '...' 
      : userContent;
      
    await query(
      'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2',
      [title || 'New Conversation', conversation.id],
      { useAuthenticated: true }
    );
  } else {
    // Just update the timestamp
    await query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversation.id],
      { useAuthenticated: true }
    );
  }
}

/**
 * Creates a new expense from extracted data
 */
export async function createExpense(
  accountId: string, 
  userId: string, 
  conversationId: string,
  expenseData: ExpenseData
): Promise<Expense | null> {
  // Format the date (use today if not provided or invalid)
  const today = new Date().toISOString().split('T')[0];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const date = expenseData.date && dateRegex.test(expenseData.date) 
    ? expenseData.date 
    : today;
  
  // Insert the expense with account context
  const newExpense = await query(
    `INSERT INTO expenses (
      id, account_id, amount, description, vendor, date, 
      created_by, created_at, updated_at, metadata
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, 
      $6, NOW(), NOW(), $7
    )
    RETURNING *`,
    [
      accountId,
      Number(expenseData.amount),
      expenseData.description || 'Expense from chat',
      expenseData.vendor || null,
      date,
      userId,
      { source: 'chat', conversation_id: conversationId }
    ],
    { useAuthenticated: true }
  );
  
  return newExpense?.[0] || null;
}

/**
 * Processes categories for an expense
 */
export async function processExpenseCategories(
  accountId: string,
  expenseId: string,
  categories: string[]
): Promise<void> {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return;
  }

  for (const categoryName of categories) {
    // Find or create the category
    let category = await queryOne(
      'SELECT * FROM categories WHERE account_id = $1 AND LOWER(name) = LOWER($2)',
      [accountId, categoryName],
      { useAuthenticated: true }
    );
    
    if (!category) {
      category = await queryOne(
        'INSERT INTO categories (id, account_id, name, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING *',
        [accountId, categoryName],
        { useAuthenticated: true }
      );
    }
    
    // Link expense to category
    await query(
      'INSERT INTO expense_categories (expense_id, category_id) VALUES ($1, $2)',
      [expenseId, category.id],
      { useAuthenticated: true }
    );
  }
}

/**
 * Updates conversation metadata when expenses are found
 */
export async function updateConversationWithExpenseContext(conversationId: string): Promise<void> {
  await query(
    'UPDATE conversations SET updated_at = NOW(), metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{has_expenses}\', \'true\') WHERE id = $1',
    [conversationId],
    { useAuthenticated: true }
  );
}

/**
 * Gets the current expense count for debugging
 */
export async function getExpenseCount(accountId: string): Promise<number> {
  try {
    const expenses = await query(
      'SELECT COUNT(*) as count FROM expenses WHERE account_id = $1',
      [accountId],
      { useAuthenticated: true }
    );
    return expenses[0]?.count || 0;
  } catch (error) {
    console.error('Error checking expense count:', error);
    return 0;
  }
}
