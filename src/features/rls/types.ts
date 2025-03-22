/**
 * Types for Row Level Security (RLS) policies
 */

/**
 * Policy operation types
 */
export enum PolicyOperation {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

/**
 * Policy definition for a specific operation on a table
 */
export interface PolicyDefinition {
  tableName: string;
  operation: PolicyOperation;
  policyName?: string;
  using: string;
  withCheck?: string;
  skipIfError?: boolean;
}

/**
 * Complete set of policies for a table
 */
export interface TablePolicies {
  select: string;
  insert?: string;
  update?: string;
  delete?: string;
}

/**
 * Result of applying a policy
 */
export interface PolicyResult {
  success: boolean;
  table: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Result of the overall RLS setup
 */
export interface RLSSetupResult {
  success: boolean;
  results: PolicyResult[];
  message?: string;
}
