import { TablePolicies } from '../types';

/**
 * Core table policies for the main entities in the application
 */
export const corePolicies: Record<string, TablePolicies> = {
  users: {
    select: "id = app.get_current_user_id() OR app.get_current_user_id() IS NULL",
    update: "id = app.get_current_user_id()",
    delete: "false"
  },
  
  accounts: {
    select: "id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
    insert: "true",
    update: "id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')",
    delete: "id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
  },
  
  account_members: {
    select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
    insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner') OR app.get_current_user_id() IS NULL",
    update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')",
    delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
  },
  
  expenses: {
    select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
    insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
    update: "(created_by = app.get_current_user_id() OR account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner'))",
    delete: "(created_by = app.get_current_user_id() OR account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner'))"
  },
  
  categories: {
    select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
    insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
    update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
    delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
  }
};
