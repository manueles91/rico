-- Migration: 005_create_expenses_table
-- Description: Creates the expenses table for storing expense records

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  vendor TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  receipt_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for faster lookups and filtering
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor);

-- Create GIN index for full-text search on description and vendor
CREATE INDEX IF NOT EXISTS idx_expenses_description_vendor ON expenses USING gin(
  (to_tsvector('english', coalesce(description, '') || ' ' || coalesce(vendor, '')))
);
