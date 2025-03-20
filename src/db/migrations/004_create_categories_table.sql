-- Migration: 004_create_categories_table
-- Description: Creates the categories table for expense categorization

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(account_id, name)
);

-- Create index for faster lookups by account_id
CREATE INDEX IF NOT EXISTS idx_categories_account_id ON categories(account_id);

-- Insert default categories for easier onboarding
INSERT INTO categories (account_id, name, icon, color, created_by)
SELECT 
  a.id, 
  c.name, 
  c.icon, 
  c.color, 
  am.user_id
FROM 
  accounts a
CROSS JOIN (
  VALUES 
    ('Food & Dining', 'utensils', '#FF5733'),
    ('Transportation', 'car', '#33A8FF'),
    ('Housing', 'home', '#33FF57'),
    ('Entertainment', 'film', '#D433FF'),
    ('Shopping', 'shopping-bag', '#FFD433'),
    ('Utilities', 'zap', '#33FFD4'),
    ('Healthcare', 'activity', '#FF3333'),
    ('Personal', 'user', '#3357FF'),
    ('Travel', 'map', '#FF33A8'),
    ('Other', 'more-horizontal', '#808080')
) AS c(name, icon, color)
JOIN account_members am ON a.id = am.account_id AND am.role = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM categories 
  WHERE categories.account_id = a.id AND categories.name = c.name
)
ON CONFLICT (account_id, name) DO NOTHING;
