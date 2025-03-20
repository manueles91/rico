import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import { Category } from '../route';

interface Params {
  params: {
    id: string;
  };
}

// Helper to check if user has access to a category
async function checkCategoryAccess(categoryId: string, userId: string): Promise<{ hasAccess: boolean; role: string | null; category: Category | null }> {
  const category = await queryOne<Category>(
    'SELECT * FROM categories WHERE id = $1',
    [categoryId]
  );
  
  if (!category) {
    return { hasAccess: false, role: null, category: null };
  }
  
  const membership = await queryOne(
    'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
    [category.account_id, userId]
  );
  
  return {
    hasAccess: !!membership,
    role: membership ? membership.role : null,
    category
  };
}

// GET /api/categories/[id] - Get a specific category
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // Fetch the category
    const category = await queryOne<Category>(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    
    if (!category) {
      return notFoundResponse('Category');
    }
    
    // Verify user has access if userId is provided
    if (userId) {
      const { hasAccess } = await checkCategoryAccess(id, userId);
      if (!hasAccess) {
        return forbiddenResponse('You do not have access to this category');
      }
    }
    
    // Get expense count for this category
    const expenseCount = await queryOne(
      'SELECT COUNT(*) as count FROM expense_categories WHERE category_id = $1',
      [id]
    );
    
    return successResponse({
      ...category,
      expense_count: parseInt(expenseCount.count) || 0
    });
  } catch (error: any) {
    return errorResponse(`Error fetching category: ${error.message}`);
  }
}

// PUT /api/categories/[id] - Update a category
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, color, icon, userId } = body;
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the category
    const { hasAccess, role, category } = await checkCategoryAccess(id, userId);
    
    if (!category) {
      return notFoundResponse('Category');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this category');
    }
    
    // Check if user has permission to edit categories
    if (role === 'viewer') {
      return forbiddenResponse('Viewers cannot edit categories');
    }
    
    // Check if changing to a name that already exists
    if (name && name !== category.name) {
      const existingCategory = await queryOne(
        'SELECT * FROM categories WHERE account_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [category.account_id, name, id]
      );
      
      if (existingCategory) {
        return errorResponse('A category with this name already exists', 409);
      }
    }
    
    // Prevent modifying default categories
    if (category.is_default) {
      return errorResponse('Cannot modify default categories', 409);
    }
    
    // Update the category
    const updatedCategory = await queryOne<Category>(
      `UPDATE categories 
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           icon = COALESCE($3, icon),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, color, icon, id]
    );
    
    return successResponse(updatedCategory);
  } catch (error: any) {
    return errorResponse(`Error updating category: ${error.message}`);
  }
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('User ID is required');
    }
    
    // Verify user has access to the category
    const { hasAccess, role, category } = await checkCategoryAccess(id, userId);
    
    if (!category) {
      return notFoundResponse('Category');
    }
    
    if (!hasAccess) {
      return forbiddenResponse('You do not have access to this category');
    }
    
    // Check if user has permission to delete categories
    if (role === 'viewer') {
      return forbiddenResponse('Viewers cannot delete categories');
    }
    
    // Prevent deleting default categories
    if (category.is_default) {
      return errorResponse('Cannot delete default categories', 409);
    }
    
    // Check if category is in use
    const expenseCount = await queryOne(
      'SELECT COUNT(*) as count FROM expense_categories WHERE category_id = $1',
      [id]
    );
    
    if (parseInt(expenseCount.count) > 0) {
      return errorResponse(
        'Cannot delete category that is in use by expenses. Remove the category from all expenses first.',
        409
      );
    }
    
    // Delete the category
    await query('DELETE FROM categories WHERE id = $1', [id]);
    
    return successResponse({ id }, 'Category deleted successfully');
  } catch (error: any) {
    return errorResponse(`Error deleting category: ${error.message}`);
  }
}
