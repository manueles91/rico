import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  createdResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export interface Category {
  id: string;
  account_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
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

// GET /api/categories - Get all categories for an account
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId');
    
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
    
    // Get categories with their expense counts
    const categories = await query<Category & { expense_count: number }>(
      `SELECT 
         c.*,
         COUNT(ec.expense_id) as expense_count
       FROM categories c
       LEFT JOIN expense_categories ec ON c.id = ec.category_id
       WHERE c.account_id = $1
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [accountId]
    );
    
    return successResponse(categories);
  } catch (error: any) {
    return errorResponse(`Error fetching categories: ${error.message}`);
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, name, color, icon, userId } = body;
    
    if (!accountId || !name || !color) {
      return errorResponse('Missing required fields (accountId, name, color)');
    }
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the account
    const { hasAccess, role } = await checkAccountAccess(accountId, userId);
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this account');
    }
    
    // Check if user has permission to create categories
    if (role === 'viewer') {
      return forbiddenResponse('Viewers cannot create categories');
    }
    
    // Check if category with same name already exists
    const existingCategory = await queryOne(
      'SELECT * FROM categories WHERE account_id = $1 AND LOWER(name) = LOWER($2)',
      [accountId, name]
    );
    
    if (existingCategory) {
      return errorResponse('A category with this name already exists', 409);
    }
    
    // Create new category
    const newCategory = await queryOne<Category>(
      `INSERT INTO categories (account_id, name, color, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [accountId, name, color, icon || null]
    );
    
    return createdResponse(newCategory);
  } catch (error: any) {
    return errorResponse(`Error creating category: ${error.message}`);
  }
}
