import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export interface Expense {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  vendor: string;
  date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  receipt_url: string | null;
  metadata: any;
}

export interface ExpenseWithCategories extends Expense {
  categories: string[];
}

// Helper to check if user has access to an account
async function checkAccountAccess(accountId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null }> {
  const membership = await queryOne(
    'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
    [accountId, userId]
  );
  
  return {
    hasAccess: !!membership,
    role: membership ? membership.role : null
  };
}

// GET /api/expenses - Get all expenses (with filtering)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    if (!accountId) {
      return errorResponse('Account ID is required');
    }
    
    // Verify user has access to the account
    if (userId) {
      const { hasAccess } = await checkAccountAccess(accountId, userId);
      if (!hasAccess) {
        return forbiddenResponse('You do not have access to this account');
      }
    }
    
    // Build the query
    let sql = `
      SELECT e.*, array_agg(c.name) as categories
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.id = ec.expense_id
      LEFT JOIN categories c ON ec.category_id = c.id
      WHERE e.account_id = $1
    `;
    
    const queryParams: any[] = [accountId];
    let paramIndex = 2;
    
    if (startDate) {
      sql += ` AND e.date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      sql += ` AND e.date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    if (category) {
      sql += ` AND c.name = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }
    
    sql += `
      GROUP BY e.id
      ORDER BY e.date DESC
      LIMIT $${paramIndex}
    `;
    queryParams.push(limit.toString());
    
    const expenses = await query<ExpenseWithCategories>(sql, queryParams);
    
    return successResponse(expenses);
  } catch (error: any) {
    return errorResponse(`Error fetching expenses: ${error.message}`);
  }
}

// POST /api/expenses - Create a new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      accountId, 
      amount, 
      description, 
      vendor, 
      date, 
      createdBy, 
      receiptUrl,
      metadata,
      categoryIds 
    } = body;
    
    if (!accountId || !amount || !description || !date || !createdBy) {
      return errorResponse('Missing required fields');
    }
    
    // Verify user has access to the account
    const { hasAccess, role } = await checkAccountAccess(accountId, createdBy);
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this account');
    }
    
    // Check if user has permission to add expenses
    if (role === 'viewer') {
      return forbiddenResponse('Viewers cannot add expenses');
    }
    
    // Use the add_simple_expense function if category names are provided
    if (body.categoryNames && Array.isArray(body.categoryNames)) {
      const result = await queryOne<Expense>(
        'SELECT * FROM add_simple_expense($1, $2, $3, $4, $5, $6, $7)',
        [accountId, amount, description, vendor, date, createdBy, body.categoryNames]
      );
      
      return createdResponse(result);
    }
    
    // Insert the expense
    const newExpense = await queryOne<Expense>(
      `INSERT INTO expenses (
         account_id, amount, description, vendor, date, 
         created_by, receipt_url, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        accountId, 
        amount, 
        description, 
        vendor || '', 
        date, 
        createdBy, 
        receiptUrl || null, 
        metadata || null
      ]
    );
    
    // Add categories if provided
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0 && newExpense) {
      for (const categoryId of categoryIds) {
        await query(
          'INSERT INTO expense_categories (expense_id, category_id) VALUES ($1, $2)',
          [newExpense.id, categoryId]
        );
      }
    }
    
    // Fetch the expense with categories for the response
    const expenseWithCategories = newExpense ? await queryOne<ExpenseWithCategories>(
      `SELECT e.*, array_agg(c.name) as categories
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.id = ec.expense_id
       LEFT JOIN categories c ON ec.category_id = c.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [newExpense.id]
    ) : null;
    
    return createdResponse(expenseWithCategories);
  } catch (error: any) {
    return errorResponse(`Error creating expense: ${error.message}`);
  }
}
