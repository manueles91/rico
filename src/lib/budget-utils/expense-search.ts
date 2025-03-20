import { query } from '@/lib/db';
import { checkAccountAccess } from '@/lib/db-utils';
import { getPaginatedResults, PaginatedResult } from '@/lib/db-utils/pagination';

/**
 * Expense search utilities for budget operations
 */

export interface Expense {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  description: string;
  created_at: string;
  updated_at: string;
  categories?: string[];
}

export interface ExpenseSearchOptions {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  userId?: string;
}

/**
 * Search expenses with advanced filtering
 * @param accountId The ID of the account
 * @param options Search options including filters, pagination, and sorting
 * @returns Paginated results of expenses matching the criteria
 */
export async function searchExpenses(
  accountId: string,
  options: ExpenseSearchOptions
): Promise<PaginatedResult<Expense>> {
  const {
    startDate,
    endDate,
    categories,
    minAmount,
    maxAmount,
    searchTerm,
    page = 1,
    limit = 20,
    sortBy = 'date',
    sortDirection = 'DESC',
    userId
  } = options;
  
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Build the WHERE clause
  let whereConditions = ['e.account_id = $1'];
  let params = [accountId];
  let paramIndex = 2;
  
  // Add date range filters
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
  // Ensure numeric values are converted to strings for SQL parameters
  if (minAmount !== undefined) {
    whereConditions.push(`e.amount >= $${paramIndex}`);
    params.push(String(minAmount));
    paramIndex++;
  }
  
  if (maxAmount !== undefined) {
    whereConditions.push(`e.amount <= $${paramIndex}`);
    params.push(String(maxAmount));
    paramIndex++;
  }
  
  // Add search term filter
  if (searchTerm) {
    whereConditions.push(`e.description ILIKE $${paramIndex}`);
    params.push(`%${searchTerm}%`);
    paramIndex++;
  }
  
  // Add category filter
  let categoryJoin = '';
  if (categories && categories.length > 0) {
    categoryJoin = `
      JOIN expense_categories ec ON e.id = ec.expense_id
      JOIN categories c ON ec.category_id = c.id AND c.name = ANY($${paramIndex})
    `;
    params.push(`{${categories.join(',')}}`);
    paramIndex++;
  }
  
  // Build the query
  const baseQuery = `
    SELECT 
      e.*,
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
    ORDER BY e.${sortBy} ${sortDirection}
  `;
  
  // Get paginated results
  return await getPaginatedResults<Expense>(
    baseQuery,
    null,
    params,
    Number(page),
    Number(limit)
  );
}

/**
 * Get top expenses for an account
 * @param accountId The ID of the account
 * @param limit Number of top expenses to retrieve (default: 10)
 * @param startDate Start date for filtering (YYYY-MM-DD)
 * @param endDate End date for filtering (YYYY-MM-DD)
 * @param userId Optional user ID to check access
 * @returns Array of top expenses with their categories
 */
export async function getTopExpenses(
  accountId: string,
  limit: number = 10,
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<Expense[]> {
  // Check access if userId is provided
  if (userId) {
    const { hasAccess } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this account');
    }
  }
  
  // Build the WHERE clause
  let whereConditions = ['e.account_id = $1'];
  let params = [accountId];
  let paramIndex = 2;
  
  // Add date range filters
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
  
  // Get top expenses
  return await query<Expense>(
    `SELECT 
       e.*,
       COALESCE(
         array_agg(c.name) FILTER (WHERE c.name IS NOT NULL),
         ARRAY[]::text[]
       ) as categories
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.id = ec.expense_id
     LEFT JOIN categories c ON ec.category_id = c.id
     WHERE ${whereConditions.join(' AND ')}
     GROUP BY e.id
     ORDER BY e.amount DESC
     LIMIT $${paramIndex}`,
    [...params, String(limit)]
  );
}

// Force a new deployment
