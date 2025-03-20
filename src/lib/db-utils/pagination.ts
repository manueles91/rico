import { query, queryOne } from '@/lib/db';

/**
 * Pagination utilities for database queries
 */

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Get paginated results with total count
 * @param baseQuery The base SQL query without LIMIT/OFFSET
 * @param countQuery The query to count total items (defaults to COUNT(*) with baseQuery)
 * @param params Query parameters
 * @param page Current page (1-based)
 * @param limit Items per page
 * @returns Object with data and pagination information
 */
export async function getPaginatedResults<T>(
  baseQuery: string,
  countQuery: string | null = null,
  params: any[] = [],
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<T>> {
  // Ensure page and limit are valid
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(100, limit));
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  // Add pagination to the query
  const paginatedQuery = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
  
  // Execute the main query
  const data = await query<T>(paginatedQuery, params);
  
  // Generate count query if not provided
  if (!countQuery) {
    // Extract the FROM part and any JOINs and WHERE clauses
    const fromRegex = /FROM\s+.+?(?=(ORDER BY|GROUP BY|LIMIT|$))/i;
    const fromMatch = baseQuery.match(fromRegex);
    
    if (fromMatch) {
      countQuery = `SELECT COUNT(*) as total ${fromMatch[0]}`;
    } else {
      throw new Error('Could not generate count query automatically');
    }
  }
  
  // Get total count
  const countResult = await queryOne<{ total: string }>(countQuery, params);
  const total = parseInt(countResult?.total || '0');
  
  // Calculate total pages
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    }
  };
}
