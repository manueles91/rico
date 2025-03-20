import { query } from '@/lib/db';
import { getPaginatedResults, PaginatedResult } from './pagination';

/**
 * Search utilities for database queries
 */

/**
 * Search entities with filtering and pagination
 * @param table The table to search
 * @param searchConfig Search configuration
 * @returns Paginated results matching the search criteria
 */
export async function searchEntities<T>(
  table: string,
  searchConfig: {
    filters: Record<string, any>;
    searchColumns?: string[];
    searchTerm?: string;
    orderBy?: string;
    page?: number;
    limit?: number;
    joinClause?: string;
    selectClause?: string;
    groupBy?: string;
  }
): Promise<PaginatedResult<T>> {
  const {
    filters = {},
    searchColumns = [],
    searchTerm = '',
    orderBy = 'created_at DESC',
    page = 1,
    limit = 20,
    joinClause = '',
    selectClause = `${table}.*`,
    groupBy = ''
  } = searchConfig;
  
  // Build the WHERE clause
  let whereConditions: string[] = [];
  let params: any[] = [];
  let paramIndex = 1;
  
  // Add filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          whereConditions.push(`${key} = ANY($${paramIndex})`);
          params.push(value.map(item => typeof item === 'number' ? String(item) : item));
          paramIndex++;
        }
      } else {
        whereConditions.push(`${key} = $${paramIndex}`);
        params.push(typeof value === 'number' ? String(value) : value);
        paramIndex++;
      }
    }
  }
  
  // Add search term if provided
  if (searchTerm && searchColumns.length > 0) {
    const searchConditions = searchColumns.map(column => {
      return `${column}::text ILIKE $${paramIndex}`;
    });
    
    whereConditions.push(`(${searchConditions.join(' OR ')})`);
    params.push(`%${searchTerm}%`);
    paramIndex++;
  }
  
  // Build the WHERE clause
  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';
  
  // Build the GROUP BY clause
  const groupByClause = groupBy ? `GROUP BY ${groupBy}` : '';
  
  // Build the ORDER BY clause
  const orderByClause = orderBy ? `ORDER BY ${orderBy}` : '';
  
  // Build the base query
  const baseQuery = `
    SELECT ${selectClause}
    FROM ${table}
    ${joinClause}
    ${whereClause}
    ${groupByClause}
    ${orderByClause}
  `;
  
  // Get paginated results
  return await getPaginatedResults<T>(
    baseQuery,
    null,
    params,
    Number(page),
    Number(limit)
  );
}
