import { query, queryOne, transaction } from '@/lib/db';

/**
 * Entity management utilities for database operations
 */

/**
 * Add entity with related items in a transaction
 * @param mainTable The main table to insert into
 * @param mainData The data for the main entity
 * @param relatedItems Array of related items to insert
 * @param relationConfig Configuration for the relation
 * @returns The created entity with ID
 */
export async function addEntityWithRelations<T>(
  mainTable: string,
  mainData: Record<string, any>,
  relatedItems: any[] = [],
  relationConfig: {
    relationTable: string;
    mainIdColumn: string;
    relatedIdColumn: string;
    getRelatedId: (item: any) => string | number;
  }
): Promise<T> {
  return await transaction(async (client) => {
    // Build the insert query for the main entity
    const columns = Object.keys(mainData);
    const values = Object.values(mainData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const insertQuery = `
      INSERT INTO ${mainTable} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    // Insert the main entity
    const result = await client.queryOne(insertQuery, values);
    
    if (!result) {
      throw new Error(`Failed to insert into ${mainTable}`);
    }
    
    // If there are related items, insert them
    if (relatedItems.length > 0 && relationConfig) {
      const { relationTable, mainIdColumn, relatedIdColumn, getRelatedId } = relationConfig;
      
      // Get the ID of the main entity
      const mainId = (result as any).id;
      
      // Build the insert query for the related items
      const relationInsertQuery = `
        INSERT INTO ${relationTable} (${mainIdColumn}, ${relatedIdColumn})
        VALUES ($1, $2)
      `;
      
      // Insert each related item
      for (const item of relatedItems) {
        const relatedId = getRelatedId(item);
        await client.query(relationInsertQuery, [mainId, relatedId]);
      }
    }
    
    return result;
  });
}

/**
 * Update entity with related items in a transaction
 * @param mainTable The main table to update
 * @param entityId The ID of the entity to update
 * @param updateData The data to update
 * @param relatedItems Array of related items to update
 * @param relationConfig Configuration for the relation
 * @returns The updated entity
 */
export async function updateEntityWithRelations<T>(
  mainTable: string,
  entityId: string,
  updateData: Record<string, any>,
  relatedItems: any[] = [],
  relationConfig: {
    relationTable: string;
    mainIdColumn: string;
    relatedIdColumn: string;
    getRelatedId: (item: any) => string | number;
    replaceExisting?: boolean;
  }
): Promise<T> {
  return await transaction(async (client) => {
    // Build the update query for the main entity
    if (Object.keys(updateData).length > 0) {
      const setClause = Object.keys(updateData)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      
      const updateQuery = `
        UPDATE ${mainTable}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      // Update the main entity
      const result = await client.queryOne(
        updateQuery, 
        [entityId, ...Object.values(updateData)]
      );
      
      if (!result) {
        throw new Error(`Entity with ID ${entityId} not found in ${mainTable}`);
      }
    }
    
    // If there are related items and relation config, update them
    if (relatedItems && relationConfig) {
      const { 
        relationTable, 
        mainIdColumn, 
        relatedIdColumn, 
        getRelatedId,
        replaceExisting = true
      } = relationConfig;
      
      // If replacing existing relations, delete them first
      if (replaceExisting) {
        await client.query(
          `DELETE FROM ${relationTable} WHERE ${mainIdColumn} = $1`,
          [entityId]
        );
      }
      
      // Insert new relations
      if (relatedItems.length > 0) {
        const relationInsertQuery = `
          INSERT INTO ${relationTable} (${mainIdColumn}, ${relatedIdColumn})
          VALUES ($1, $2)
          ON CONFLICT (${mainIdColumn}, ${relatedIdColumn}) DO NOTHING
        `;
        
        for (const item of relatedItems) {
          const relatedId = getRelatedId(item);
          await client.query(relationInsertQuery, [entityId, relatedId]);
        }
      }
    }
    
    // Return the updated entity
    return await client.queryOne(
      `SELECT * FROM ${mainTable} WHERE id = $1`,
      [entityId]
    );
  });
}

/**
 * Get entity with its related items
 * @param mainTable The main table to query
 * @param entityId The ID of the entity
 * @param joinConfig Configuration for the join
 * @returns The entity with related items
 */
export async function getEntityWithRelations<T>(
  mainTable: string,
  entityId: string,
  joinConfig: {
    joinTable: string;
    joinColumn: string;
    selectColumns: string[];
    aggregateAs: string;
    additionalJoins?: string;
    whereClause?: string;
  }
): Promise<T> {
  const {
    joinTable,
    joinColumn,
    selectColumns,
    aggregateAs,
    additionalJoins = '',
    whereClause = ''
  } = joinConfig;
  
  // Build the columns to select from the related table
  const relatedSelect = selectColumns.length > 0
    ? `json_build_object(${selectColumns.map(col => `'${col}', r.${col}`).join(', ')})`
    : 'r.*';
  
  // Build the query
  const query = `
    SELECT 
      m.*,
      COALESCE(
        json_agg(${relatedSelect}) FILTER (WHERE r.id IS NOT NULL),
        '[]'
      ) as ${aggregateAs}
    FROM ${mainTable} m
    LEFT JOIN ${joinTable} j ON m.id = j.${joinColumn}
    LEFT JOIN ${joinTable.split(' ')[0]} r ON j.${joinTable.split(' ')[0]}_id = r.id
    ${additionalJoins}
    WHERE m.id = $1 ${whereClause ? `AND ${whereClause}` : ''}
    GROUP BY m.id
  `;
  
  const result = await queryOne(query, [entityId]);
  
  if (!result) {
    throw new Error(`Entity with ID ${entityId} not found in ${mainTable}`);
  }
  
  return result;
}

/**
 * Safely delete an entity with checks
 * @param table The table to delete from
 * @param entityId The ID of the entity to delete
 * @param checkFn Optional function to run checks before deletion
 * @returns True if deletion was successful
 */
export async function safeDeleteEntity(
  table: string,
  entityId: string,
  checkFn?: () => Promise<boolean>
): Promise<boolean> {
  // Run pre-deletion checks if provided
  if (checkFn) {
    const canDelete = await checkFn();
    if (!canDelete) {
      return false;
    }
  }
  
  // Check if the entity exists
  const entity = await queryOne(
    `SELECT id FROM ${table} WHERE id = $1`,
    [entityId]
  );
  
  if (!entity) {
    return false;
  }
  
  // Delete the entity
  const result = await query(
    `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
    [entityId]
  );
  
  return result.length > 0;
}
