import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import { Expense, ExpenseWithCategories } from '../route';

export const dynamic = 'force-dynamic';

interface Params {
  params: {
    id: string;
  };
}

// Helper to check if user has access to an expense
async function checkExpenseAccess(expenseId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null; expense: Expense | null }> {
  const expense = await queryOne<Expense>(
    'SELECT * FROM expenses WHERE id = $1',
    [expenseId]
  );
  
  if (!expense) {
    return { hasAccess: false, role: null, expense: null };
  }
  
  const membership = await queryOne(
    'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
    [expense.account_id, userId]
  );
  
  return {
    hasAccess: !!membership,
    role: membership ? membership.role : null,
    expense
  };
}

// GET /api/expenses/[id] - Get a specific expense
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // Fetch the expense with categories
    const expense = await queryOne<ExpenseWithCategories>(
      `SELECT e.*, array_agg(c.name) as categories
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.id = ec.expense_id
       LEFT JOIN categories c ON ec.category_id = c.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );
    
    if (!expense) {
      return notFoundResponse('Expense');
    }
    
    // Verify user has access if userId is provided
    if (userId) {
      const { hasAccess } = await checkExpenseAccess(id, userId);
      if (!hasAccess) {
        return forbiddenResponse('You do not have access to this expense');
      }
    }
    
    return successResponse(expense);
  } catch (error: any) {
    return errorResponse(`Error fetching expense: ${error.message}`);
  }
}

// PUT /api/expenses/[id] - Update an expense
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      amount, 
      description, 
      vendor, 
      date, 
      userId, 
      receiptUrl,
      metadata,
      categoryIds 
    } = body;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the expense
    const { hasAccess, role, expense } = await checkExpenseAccess(id, userId);
    
    if (!expense) {
      return notFoundResponse('Expense');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this expense');
    }
    
    // Check if user has permission to edit expenses
    if (role === 'viewer') {
      return forbiddenResponse('Viewers cannot edit expenses');
    }
    
    // Check if user is the creator or an admin
    const isCreatorOrAdmin = expense.created_by === userId || role === 'admin';
    if (!isCreatorOrAdmin && role !== 'admin') {
      return forbiddenResponse('Only the creator or admins can edit this expense');
    }
    
    // Update the expense
    const updatedExpense = await queryOne<Expense>(
      `UPDATE expenses 
       SET amount = COALESCE($1, amount),
           description = COALESCE($2, description),
           vendor = COALESCE($3, vendor),
           date = COALESCE($4, date),
           receipt_url = COALESCE($5, receipt_url),
           metadata = COALESCE($6, metadata),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        amount, 
        description, 
        vendor, 
        date, 
        receiptUrl, 
        metadata,
        id
      ]
    );
    
    // Update categories if provided
    if (categoryIds && Array.isArray(categoryIds)) {
      // Delete existing categories
      await query('DELETE FROM expense_categories WHERE expense_id = $1', [id]);
      
      // Add new categories
      for (const categoryId of categoryIds) {
        await query(
          'INSERT INTO expense_categories (expense_id, category_id) VALUES ($1, $2)',
          [id, categoryId]
        );
      }
    }
    
    // Fetch the updated expense with categories
    const expenseWithCategories = await queryOne<ExpenseWithCategories>(
      `SELECT e.*, array_agg(c.name) as categories
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.id = ec.expense_id
       LEFT JOIN categories c ON ec.category_id = c.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );
    
    return successResponse(expenseWithCategories);
  } catch (error: any) {
    return errorResponse(`Error updating expense: ${error.message}`);
  }
}

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the expense
    const { hasAccess, role, expense } = await checkExpenseAccess(id, userId);
    
    if (!expense) {
      return notFoundResponse('Expense');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this expense');
    }
    
    // Check if user is the creator or an admin
    const isCreatorOrAdmin = expense.created_by === userId || role === 'admin';
    if (!isCreatorOrAdmin && role !== 'admin') {
      return forbiddenResponse('Only the creator or admins can delete this expense');
    }
    
    // Delete the expense (cascading delete will handle expense_categories)
    await query('DELETE FROM expenses WHERE id = $1', [id]);
    
    return successResponse({ id }, 'Expense deleted successfully');
  } catch (error: any) {
    return errorResponse(`Error deleting expense: ${error.message}`);
  }
}
