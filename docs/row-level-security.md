# Row-Level Security (RLS) Implementation

This document explains how Row-Level Security (RLS) is implemented in the Modern Web Template application.

## Overview

Row-Level Security (RLS) is a feature provided by PostgreSQL that allows database administrators to define security policies that restrict which rows can be viewed or modified by different users. In our application, we use RLS to ensure that users can only access their own data and accounts they are members of.

## How It Works

1. **Authenticated Connections**: When a user is authenticated, we set a session variable (`app.current_user_id`) that identifies the current user.
2. **RLS Policies**: We've defined policies on each table that use this session variable to filter rows.
3. **Direct Client Connections**: We use direct client connections (not pooled) for authenticated operations to ensure session variables are set correctly.

## Implemented Policies

### Users Table

- Users can only see their own user data
- Users cannot delete their own data (admin action only)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_select_policy ON users
  FOR SELECT USING (id = auth.user_id());

CREATE POLICY user_update_policy ON users
  FOR UPDATE USING (id = auth.user_id());
```

### Accounts Table

- Users can only see accounts they are members of
- Account owners can update account details
- Only account owners can delete accounts

```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_select_policy ON accounts
  FOR SELECT USING (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY account_insert_policy ON accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY account_update_policy ON accounts
  FOR UPDATE USING (
    id IN (
      SELECT account_id FROM account_members 
      WHERE user_id = auth.user_id() AND role = 'owner'
    )
  );

CREATE POLICY account_delete_policy ON accounts
  FOR DELETE USING (
    id IN (
      SELECT account_id FROM account_members 
      WHERE user_id = auth.user_id() AND role = 'owner'
    )
  );
```

### Expenses Table

- Users can only see expenses from accounts they are members of
- Users can only create expenses in accounts they are members of
- Expenses can only be modified by their creator or account owners

Similar policies are implemented for:
- Account Members
- Categories
- Expense Categories
- Conversations
- Messages
- Attachments
- Invitations

## Testing RLS

We've provided several ways to test RLS:

1. **API Endpoint**: Visit `/api/test-rls` when logged in to see your user data, accounts, and expenses.
2. **Command Line Script**: Run `npm run test:rls` to test RLS with multiple simulated users.
3. **Setup RLS**: Run `npm run setup:rls` to apply or update RLS policies.

## Authenticating Queries

To ensure RLS policies are enforced, you must use the `useAuthenticated` option when making database queries:

```typescript
// Example of an authenticated query
const userAccounts = await query(
  `SELECT * FROM accounts WHERE id = $1`,
  [accountId],
  { useAuthenticated: true }
);
```

## Troubleshooting

### Common Issues

1. **Cannot see data**: Ensure you're using authenticated connections (`useAuthenticated: true`)
2. **RLS not working**: Make sure RLS is enabled on the table and proper policies are in place
3. **Permission errors**: Check that the user has the correct role in the account_members table

### Debugging Tips

- Review logs for authentication issues
- Check if the session variable is being properly set
- Test with direct SQL using the PostgreSQL client

## Security Considerations

- Always use parameterized queries to prevent SQL injection
- Never bypass RLS policies in application code
- Regularly review RLS policies when adding new features
- Implement proper input validation in addition to RLS

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Neon Database Security Features](https://neon.tech/docs/security)
