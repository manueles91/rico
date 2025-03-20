-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY users_select ON users
    FOR SELECT
    USING (id = (SELECT auth.user_id()));

CREATE POLICY users_update ON users
    FOR UPDATE
    USING (id = (SELECT auth.user_id()));

-- Create policies for accounts table
CREATE POLICY accounts_select ON accounts
    FOR SELECT
    USING (
        id IN (
            SELECT account_id 
            FROM account_users 
            WHERE user_id = (SELECT auth.user_id())
        )
    );

CREATE POLICY accounts_insert ON accounts
    FOR INSERT
    WITH CHECK (
        created_by = (SELECT auth.user_id())
    );

CREATE POLICY accounts_update ON accounts
    FOR UPDATE
    USING (
        id IN (
            SELECT account_id 
            FROM account_users 
            WHERE user_id = (SELECT auth.user_id())
            AND role = 'owner'
        )
    );

-- Create policies for expenses table
CREATE POLICY expenses_select ON expenses
    FOR SELECT
    USING (
        account_id IN (
            SELECT account_id 
            FROM account_users 
            WHERE user_id = (SELECT auth.user_id())
        )
    );

CREATE POLICY expenses_insert ON expenses
    FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT account_id 
            FROM account_users 
            WHERE user_id = (SELECT auth.user_id())
        )
    );

CREATE POLICY expenses_update ON expenses
    FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id 
            FROM account_users 
            WHERE user_id = (SELECT auth.user_id())
        )
    );

CREATE POLICY expenses_delete ON expenses
    FOR DELETE
    USING (
        account_id IN (
            SELECT account_id 
            FROM account_users 
            WHERE user_id = (SELECT auth.user_id())
        )
    );
