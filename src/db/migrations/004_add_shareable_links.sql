-- Add shareable_links table
CREATE TABLE IF NOT EXISTS shareable_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Add index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_shareable_links_token ON shareable_links(token);

-- Add index on account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_shareable_links_account_id ON shareable_links(account_id);
