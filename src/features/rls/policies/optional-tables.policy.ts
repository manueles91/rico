import { TablePolicies } from '../types';

/**
 * Optional table policies for tables that might not exist in all environments
 * These tables are created as needed by features like chat, attachments, etc.
 */
export const optionalPolicies: Record<string, TablePolicies> = {
  expense_categories: {
    select: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())) OR app.get_current_user_id() IS NULL",
    insert: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))",
    update: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))",
    delete: "expense_id IN (SELECT id FROM expenses WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))"
  },
  
  conversations: {
    select: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR app.get_current_user_id() IS NULL",
    insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
    update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())",
    delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')"
  },
  
  messages: {
    select: "conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())) OR app.get_current_user_id() IS NULL",
    insert: "conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))",
    update: "(created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))",
    delete: "(created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))"
  },
  
  attachments: {
    select: "message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()))) OR app.get_current_user_id() IS NULL",
    insert: "message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id())))",
    update: "message_id IN (SELECT id FROM messages WHERE created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))",
    delete: "message_id IN (SELECT id FROM messages WHERE created_by = app.get_current_user_id() OR conversation_id IN (SELECT id FROM conversations WHERE account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role = 'owner')))"
  },
  
  invitations: {
    select: "(account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id()) OR email = (SELECT email FROM users WHERE id = app.get_current_user_id())) OR app.get_current_user_id() IS NULL",
    insert: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin'))",
    update: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin')) OR email = (SELECT email FROM users WHERE id = app.get_current_user_id())",
    delete: "account_id IN (SELECT account_id FROM account_members WHERE user_id = app.get_current_user_id() AND role IN ('owner', 'admin'))"
  }
};
