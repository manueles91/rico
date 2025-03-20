-- Migration: 006_create_expense_categories_table
-- Description: Creates the expense_categories table for many-to-many relationship between expenses and categories

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, category_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_categories_expense_id ON expense_categories(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_category_id ON expense_categories(category_id);
