// This script creates simplified views for the budget tracker app
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function createSimplifiedViews() {
  // Create a new client
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');
    console.log('Creating simplified views for LLM interaction...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // 1. Create a simplified user_accounts_view
    await client.query(`
      CREATE OR REPLACE VIEW user_accounts_view AS
      SELECT 
        u.id AS user_id,
        u.email,
        u.name,
        a.id AS account_id,
        a.name AS account_name,
        a.is_personal,
        am.role
      FROM 
        users u
      JOIN 
        account_members am ON u.id = am.user_id
      JOIN 
        accounts a ON am.account_id = a.id
    `);
    console.log('Created user_accounts_view');
    
    // 2. Create a simplified expenses_with_categories_view
    await client.query(`
      CREATE OR REPLACE VIEW expenses_with_categories_view AS
      SELECT 
        e.id,
        e.account_id,
        e.amount,
        e.description,
        e.vendor,
        e.date,
        e.created_by,
        e.created_at,
        array_agg(DISTINCT c.name) AS categories
      FROM 
        expenses e
      LEFT JOIN 
        expense_categories ec ON e.id = ec.expense_id
      LEFT JOIN 
        categories c ON ec.category_id = c.id
      GROUP BY 
        e.id, e.account_id, e.amount, e.description, e.vendor, e.date, e.created_by, e.created_at
    `);
    console.log('Created expenses_with_categories_view');
    
    // 3. Create a simple function for adding expenses with categories
    await client.query(`
      CREATE OR REPLACE FUNCTION add_simple_expense(
        account_id UUID,
        amount DECIMAL,
        description TEXT,
        vendor TEXT,
        date TIMESTAMP WITH TIME ZONE,
        created_by UUID,
        category_names TEXT[]
      )
      RETURNS UUID AS $$
      DECLARE
        new_expense_id UUID;
        category_id UUID;
      BEGIN
        -- Insert the expense
        INSERT INTO expenses (
          account_id, amount, description, vendor, date, created_by
        ) VALUES (
          account_id, amount, description, vendor, date, created_by
        ) RETURNING id INTO new_expense_id;
        
        -- Find and link categories by name
        IF category_names IS NOT NULL THEN
          FOR i IN 1..array_length(category_names, 1) LOOP
            SELECT id INTO category_id FROM categories 
            WHERE account_id = add_simple_expense.account_id AND name = category_names[i]
            LIMIT 1;
            
            IF category_id IS NOT NULL THEN
              INSERT INTO expense_categories (expense_id, category_id)
              VALUES (new_expense_id, category_id);
            END IF;
          END LOOP;
        END IF;
        
        RETURN new_expense_id;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('Created add_simple_expense function');
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('All views and functions created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating views:', error);
    throw error;
  } finally {
    // Close the client connection
    await client.end();
  }
}

// Run the function
createSimplifiedViews()
  .then(() => {
    console.log('Database views setup complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to set up database views:', err);
    process.exit(1);
  });
