-- Create the auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create the auth.user_id function that uses the app.current_user_id session variable
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('app.current_user_id', true), '');
$$;

-- This migration sets up Row-Level Security (RLS) for all tables
-- It ensures users can only access their own data

-- Setup RLS policies for each table in the database
DO $$
BEGIN
  -- Enable RLS on users table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS users_select_policy ON users;
    DROP POLICY IF EXISTS users_update_policy ON users;
    DROP POLICY IF EXISTS users_delete_policy ON users;
    
    -- Create policies
    CREATE POLICY users_select_policy ON users
      FOR SELECT USING (id = app.current_user_id());
      
    CREATE POLICY users_update_policy ON users
      FOR UPDATE USING (id = app.current_user_id());
      
    -- Only admins should be able to delete users
    CREATE POLICY users_delete_policy ON users
      FOR DELETE USING (false);
  END IF;
  
  -- Enable RLS on accounts table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
    ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS accounts_select_policy ON accounts;
    DROP POLICY IF EXISTS accounts_insert_policy ON accounts;
    DROP POLICY IF EXISTS accounts_update_policy ON accounts;
    DROP POLICY IF EXISTS accounts_delete_policy ON accounts;
    
    -- Create policies
    CREATE POLICY accounts_select_policy ON accounts
      FOR SELECT USING (
        id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY accounts_insert_policy ON accounts
      FOR INSERT WITH CHECK (true);
      
    CREATE POLICY accounts_update_policy ON accounts
      FOR UPDATE USING (
        id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
      
    CREATE POLICY accounts_delete_policy ON accounts
      FOR DELETE USING (
        id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
  END IF;
  
  -- Enable RLS on account_members table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'account_members') THEN
    ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS account_members_select_policy ON account_members;
    DROP POLICY IF EXISTS account_members_insert_policy ON account_members;
    DROP POLICY IF EXISTS account_members_update_policy ON account_members;
    DROP POLICY IF EXISTS account_members_delete_policy ON account_members;
    
    -- Create policies
    CREATE POLICY account_members_select_policy ON account_members
      FOR SELECT USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY account_members_insert_policy ON account_members
      FOR INSERT WITH CHECK (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
      
    CREATE POLICY account_members_update_policy ON account_members
      FOR UPDATE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
      
    CREATE POLICY account_members_delete_policy ON account_members
      FOR DELETE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
  END IF;
  
  -- Enable RLS on expenses table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS expenses_select_policy ON expenses;
    DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
    DROP POLICY IF EXISTS expenses_update_policy ON expenses;
    DROP POLICY IF EXISTS expenses_delete_policy ON expenses;
    
    -- Create policies
    CREATE POLICY expenses_select_policy ON expenses
      FOR SELECT USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY expenses_insert_policy ON expenses
      FOR INSERT WITH CHECK (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY expenses_update_policy ON expenses
      FOR UPDATE USING (
        (user_id = app.current_user_id() OR
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        ))
      );
      
    CREATE POLICY expenses_delete_policy ON expenses
      FOR DELETE USING (
        (user_id = app.current_user_id() OR
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        ))
      );
  END IF;
  
  -- Enable RLS on categories table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS categories_select_policy ON categories;
    DROP POLICY IF EXISTS categories_insert_policy ON categories;
    DROP POLICY IF EXISTS categories_update_policy ON categories;
    DROP POLICY IF EXISTS categories_delete_policy ON categories;
    
    -- Create policies
    CREATE POLICY categories_select_policy ON categories
      FOR SELECT USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY categories_insert_policy ON categories
      FOR INSERT WITH CHECK (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY categories_update_policy ON categories
      FOR UPDATE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY categories_delete_policy ON categories
      FOR DELETE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
  END IF;
  
  -- Enable RLS on expense_categories table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
    ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS expense_categories_select_policy ON expense_categories;
    DROP POLICY IF EXISTS expense_categories_insert_policy ON expense_categories;
    DROP POLICY IF EXISTS expense_categories_update_policy ON expense_categories;
    DROP POLICY IF EXISTS expense_categories_delete_policy ON expense_categories;
    
    -- Create policies
    CREATE POLICY expense_categories_select_policy ON expense_categories
      FOR SELECT USING (
        expense_id IN (
          SELECT id FROM expenses 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id()
          )
        )
      );
      
    CREATE POLICY expense_categories_insert_policy ON expense_categories
      FOR INSERT WITH CHECK (
        expense_id IN (
          SELECT id FROM expenses 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id()
          )
        )
      );
      
    CREATE POLICY expense_categories_update_policy ON expense_categories
      FOR UPDATE USING (
        expense_id IN (
          SELECT id FROM expenses 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id()
          )
        )
      );
      
    CREATE POLICY expense_categories_delete_policy ON expense_categories
      FOR DELETE USING (
        expense_id IN (
          SELECT id FROM expenses 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id()
          )
        )
      );
  END IF;
  
  -- Enable RLS on conversations table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS conversations_select_policy ON conversations;
    DROP POLICY IF EXISTS conversations_insert_policy ON conversations;
    DROP POLICY IF EXISTS conversations_update_policy ON conversations;
    DROP POLICY IF EXISTS conversations_delete_policy ON conversations;
    
    -- Create policies
    CREATE POLICY conversations_select_policy ON conversations
      FOR SELECT USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY conversations_insert_policy ON conversations
      FOR INSERT WITH CHECK (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY conversations_update_policy ON conversations
      FOR UPDATE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        )
      );
      
    CREATE POLICY conversations_delete_policy ON conversations
      FOR DELETE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role = 'owner'
        )
      );
  END IF;
  
  -- Enable RLS on messages table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS messages_select_policy ON messages;
    DROP POLICY IF EXISTS messages_insert_policy ON messages;
    DROP POLICY IF EXISTS messages_update_policy ON messages;
    DROP POLICY IF EXISTS messages_delete_policy ON messages;
    
    -- Create policies
    CREATE POLICY messages_select_policy ON messages
      FOR SELECT USING (
        conversation_id IN (
          SELECT id FROM conversations 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id()
          )
        )
      );
      
    CREATE POLICY messages_insert_policy ON messages
      FOR INSERT WITH CHECK (
        conversation_id IN (
          SELECT id FROM conversations 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id()
          )
        )
      );
      
    CREATE POLICY messages_update_policy ON messages
      FOR UPDATE USING (
        (user_id = app.current_user_id() OR
        conversation_id IN (
          SELECT id FROM conversations 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id() AND role = 'owner'
          )
        ))
      );
      
    CREATE POLICY messages_delete_policy ON messages
      FOR DELETE USING (
        (user_id = app.current_user_id() OR
        conversation_id IN (
          SELECT id FROM conversations 
          WHERE account_id IN (
            SELECT account_id FROM account_members 
            WHERE user_id = app.current_user_id() AND role = 'owner'
          )
        ))
      );
  END IF;
  
  -- Enable RLS on attachments table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attachments') THEN
    ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS attachments_select_policy ON attachments;
    DROP POLICY IF EXISTS attachments_insert_policy ON attachments;
    DROP POLICY IF EXISTS attachments_update_policy ON attachments;
    DROP POLICY IF EXISTS attachments_delete_policy ON attachments;
    
    -- Create policies
    CREATE POLICY attachments_select_policy ON attachments
      FOR SELECT USING (
        message_id IN (
          SELECT id FROM messages 
          WHERE conversation_id IN (
            SELECT id FROM conversations 
            WHERE account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.current_user_id()
            )
          )
        )
      );
      
    CREATE POLICY attachments_insert_policy ON attachments
      FOR INSERT WITH CHECK (
        message_id IN (
          SELECT id FROM messages 
          WHERE conversation_id IN (
            SELECT id FROM conversations 
            WHERE account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.current_user_id()
            )
          )
        )
      );
      
    CREATE POLICY attachments_update_policy ON attachments
      FOR UPDATE USING (
        message_id IN (
          SELECT id FROM messages 
          WHERE user_id = app.current_user_id() OR 
          conversation_id IN (
            SELECT id FROM conversations 
            WHERE account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.current_user_id() AND role = 'owner'
            )
          )
        )
      );
      
    CREATE POLICY attachments_delete_policy ON attachments
      FOR DELETE USING (
        message_id IN (
          SELECT id FROM messages 
          WHERE user_id = app.current_user_id() OR 
          conversation_id IN (
            SELECT id FROM conversations 
            WHERE account_id IN (
              SELECT account_id FROM account_members 
              WHERE user_id = app.current_user_id() AND role = 'owner'
            )
          )
        )
      );
  END IF;
  
  -- Enable RLS on invitations table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations') THEN
    ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS invitations_select_policy ON invitations;
    DROP POLICY IF EXISTS invitations_insert_policy ON invitations;
    DROP POLICY IF EXISTS invitations_update_policy ON invitations;
    DROP POLICY IF EXISTS invitations_delete_policy ON invitations;
    
    -- Create policies
    CREATE POLICY invitations_select_policy ON invitations
      FOR SELECT USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id()
        ) OR email = (
          SELECT email FROM users 
          WHERE id = app.current_user_id()
        )
      );
      
    CREATE POLICY invitations_insert_policy ON invitations
      FOR INSERT WITH CHECK (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role IN ('owner', 'admin')
        )
      );
      
    CREATE POLICY invitations_update_policy ON invitations
      FOR UPDATE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role IN ('owner', 'admin')
        ) OR email = (
          SELECT email FROM users 
          WHERE id = app.current_user_id()
        )
      );
      
    CREATE POLICY invitations_delete_policy ON invitations
      FOR DELETE USING (
        account_id IN (
          SELECT account_id FROM account_members 
          WHERE user_id = app.current_user_id() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END
$$;
