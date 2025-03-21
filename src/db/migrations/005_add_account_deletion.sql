-- Add is_deleted and deleted_at columns to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Update the created_by field for existing accounts
-- This sets the created_by to the first owner found for each account
UPDATE accounts a
SET created_by = (
  SELECT am.user_id
  FROM account_members am
  WHERE am.account_id = a.id AND am.role = 'owner'
  LIMIT 1
)
WHERE a.created_by IS NULL;

-- Make created_by NOT NULL after populating it
ALTER TABLE accounts 
ALTER COLUMN created_by SET NOT NULL;
