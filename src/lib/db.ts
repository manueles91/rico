import { Pool, PoolConfig, Client } from 'pg';
import { stackServerApp } from '@/stack';
import { cache } from 'react';

// Create two separate pools: one for anonymous connections and one for authenticated connections
let anonymousPool: Pool | null = null;
let authenticatedClient: { client: Client; userId: string } | null = null;

function getConnectionConfig(isAuthenticated = false): PoolConfig {
  const connectionString = isAuthenticated
    ? process.env.NEON_DATABASE_AUTHENTICATED_URL
    : process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error(`Missing ${isAuthenticated ? 'authenticated ' : ''}database URL`);
  }

  return {
    connectionString,
    ssl: true,
    // Optimize connection pool settings
    max: isAuthenticated ? 5 : 20, // Limit max connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Connection timeout after 2 seconds
  };
}

// Cache the pool creation to improve performance
function getAnonymousPool(): Pool {
  if (!anonymousPool) {
    anonymousPool = new Pool(getConnectionConfig(false));
    
    // Handle pool errors to prevent crashes
    anonymousPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return anonymousPool;
}

// Export getAnonymousPool as getPool for backward compatibility
export const getPool = getAnonymousPool;

// Cache the authenticated client to prevent repeated connections
async function getAuthenticatedClient(): Promise<Client> {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    throw new Error('No authenticated user found');
  }
  
  // Create a new client each time to avoid "Client was closed" errors
  // This is a tradeoff - slightly slower but more reliable
  const client = new Client(getConnectionConfig(true));
  
  try {
    await client.connect();
    
    // Set the user ID as a session parameter for RLS
    await client.query(`SELECT set_config('app.current_user_id', $1, false)`, [stackUser.id]);
    
    return client;
  } catch (error) {
    // Make sure to clean up if connection fails
    try {
      client.end().catch(err => console.error('Error ending client after connection error:', err));
    } catch (e) {
      // Ignore errors when closing an already problematic client
    }
    throw error;
  }
}

// Use React's cache for query results in read operations
const cachedQuery = cache(async <T>(
  sql: string,
  params: any[] = [],
  options: { useAuthenticated?: boolean; useCache?: boolean } = {}
): Promise<T[]> => {
  return await query<T>(sql, params, { useAuthenticated: options.useAuthenticated });
});

/**
 * Executes a SQL query and returns the results
 */
export async function query<T = any>(
  sql: string,
  params: any[] = [],
  options: { useAuthenticated?: boolean; useCache?: boolean } = {}
): Promise<T[]> {
  // Use cached results for GET operations if requested
  if (options.useCache && sql.trim().toLowerCase().startsWith('select')) {
    return cachedQuery<T>(sql, params, { ...options, useCache: false });
  }
  
  if (options.useAuthenticated) {
    const client = await getAuthenticatedClient();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('DB query error (authenticated):', error);
      throw error;
    } finally {
      // Always close the client when done
      try {
        await client.end();
      } catch (endError) {
        console.error('Error ending client:', endError);
      }
    }
  } else {
    const pool = getAnonymousPool();
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('DB query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Executes a SQL query and returns a single row
 */
export async function queryOne<T = any>(
  sql: string,
  params: any[] = [],
  options: { useAuthenticated?: boolean; useCache?: boolean } = {}
): Promise<T | null> {
  const rows = await query<T>(sql, params, options);
  return rows[0] || null;
}

/**
 * Executes a transaction with multiple SQL queries
 */
export async function transaction<T = any>(
  callback: (client: any) => Promise<T>,
  options: { useAuthenticated?: boolean } = {}
): Promise<T> {
  if (options.useAuthenticated) {
    const client = await getAuthenticatedClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  } else {
    const pool = getAnonymousPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Helper to determine if we should use authenticated connection
export async function shouldUseAuthenticatedConnection(): Promise<boolean> {
  try {
    const stackUser = await stackServerApp.getUser();
    return !!stackUser;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}
