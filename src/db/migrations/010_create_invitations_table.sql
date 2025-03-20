-- Migration: 010_create_invitations_table
-- Description: Creates the invitations table for account sharing

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(account_id, email)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_account_id ON invitations(account_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Create index for finding expired invitations
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION clean_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM invitations
  WHERE expires_at < NOW() AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
