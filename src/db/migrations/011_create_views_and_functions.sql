-- Migration: 011_create_views_and_functions
-- Description: Creates useful views and functions for the application

-- View for user accounts with roles
CREATE OR REPLACE VIEW user_accounts AS
SELECT 
  u.id AS user_id,
  u.email,
  u.name,
  a.id AS account_id,
  a.name AS account_name,
  a.description AS account_description,
  a.is_personal,
  am.role
FROM 
  users u
JOIN 
  account_members am ON u.id = am.user_id
JOIN 
  accounts a ON am.account_id = a.id;

-- View for expenses with their categories
CREATE OR REPLACE VIEW expense_with_categories AS
SELECT 
  e.id,
  e.account_id,
  e.amount,
  e.description,
  e.vendor,
  e.date,
  e.created_by,
  e.created_at,
  e.updated_at,
  e.receipt_url,
  e.metadata,
  array_agg(c.id) AS category_ids,
  array_agg(c.name) AS category_names
FROM 
  expenses e
LEFT JOIN 
  expense_categories ec ON e.id = ec.expense_id
LEFT JOIN 
  categories c ON ec.category_id = c.id
GROUP BY 
  e.id;

-- Function to add an expense with categories
CREATE OR REPLACE FUNCTION add_expense_with_categories(
  p_account_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_vendor TEXT,
  p_date TIMESTAMP WITH TIME ZONE,
  p_created_by UUID,
  p_receipt_url TEXT,
  p_metadata JSONB,
  p_category_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
  v_category_id UUID;
BEGIN
  -- Insert the expense
  INSERT INTO expenses (
    account_id, amount, description, vendor, date, created_by, receipt_url, metadata
  ) VALUES (
    p_account_id, p_amount, p_description, p_vendor, p_date, p_created_by, p_receipt_url, p_metadata
  ) RETURNING id INTO v_expense_id;
  
  -- Insert expense categories
  IF p_category_ids IS NOT NULL THEN
    FOREACH v_category_id IN ARRAY p_category_ids
    LOOP
      INSERT INTO expense_categories (expense_id, category_id)
      VALUES (v_expense_id, v_category_id);
    END LOOP;
  END IF;
  
  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get expenses for a time period
CREATE OR REPLACE FUNCTION get_expenses_by_period(
  p_account_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  id UUID,
  amount DECIMAL,
  description TEXT,
  vendor TEXT,
  date TIMESTAMP WITH TIME ZONE,
  category_names TEXT[],
  receipt_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.amount,
    e.description,
    e.vendor,
    e.date,
    array_agg(c.name) AS category_names,
    e.receipt_url
  FROM 
    expenses e
  LEFT JOIN 
    expense_categories ec ON e.id = ec.expense_id
  LEFT JOIN 
    categories c ON ec.category_id = c.id
  WHERE 
    e.account_id = p_account_id AND
    e.date >= p_start_date AND
    e.date <= p_end_date
  GROUP BY 
    e.id
  ORDER BY 
    e.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get spending by category for a time period
CREATE OR REPLACE FUNCTION get_spending_by_category(
  p_account_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  total_amount DECIMAL,
  percentage DECIMAL
) AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  -- Calculate the total spending for the period
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expenses
  WHERE account_id = p_account_id
    AND date >= p_start_date
    AND date <= p_end_date;
  
  -- Return spending by category
  RETURN QUERY
  SELECT 
    c.id AS category_id,
    c.name AS category_name,
    COALESCE(SUM(e.amount), 0) AS total_amount,
    CASE 
      WHEN v_total = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(e.amount), 0) / v_total) * 100, 2)
    END AS percentage
  FROM 
    categories c
  LEFT JOIN 
    expense_categories ec ON c.id = ec.category_id
  LEFT JOIN 
    expenses e ON ec.expense_id = e.id AND e.date >= p_start_date AND e.date <= p_end_date
  WHERE 
    c.account_id = p_account_id
  GROUP BY 
    c.id, c.name
  ORDER BY 
    total_amount DESC;
END;
$$ LANGUAGE plpgsql;
