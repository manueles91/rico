-- Migration: 003_create_account_members_table
-- Description: Creates the account_members table for many-to-many relationship between users and accounts

-- Create account_members table
CREATE TABLE IF NOT EXISTS account_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_account_members_user_id ON account_members(user_id);

-- Create index for faster lookups by account_id
CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON account_members(account_id);
