# Database Migrations

This directory contains SQL migration scripts for setting up the budget tracking application's database schema.

## Structure

- `migrations/`: Contains numbered SQL migration files that should be run in sequence
- `index.ts`: Provides utility functions for running migrations and seeding the database
- `schema.ts`: Contains Zod schemas for database entities for validation and type safety

## Migration Files

The migrations are designed to be run in order:

1. `001_create_users_table.sql`: Creates the users table
2. `002_create_accounts_table.sql`: Creates the accounts table
3. `003_create_account_members_table.sql`: Creates the account_members table
4. `004_create_categories_table.sql`: Creates the categories table with default categories
5. `005_create_expenses_table.sql`: Creates the expenses table with indexes
6. `006_create_expense_categories_table.sql`: Creates the expense_categories table
7. `007_create_conversations_table.sql`: Creates the conversations table
8. `008_create_messages_table.sql`: Creates the messages table
9. `009_create_attachments_table.sql`: Creates the attachments table
10. `010_create_invitations_table.sql`: Creates the invitations table
11. `011_create_views_and_functions.sql`: Creates useful views and functions

## Running Migrations

The migrations can be run automatically using the provided utility functions:

```typescript
import { initializeDatabase } from '@/db';

// Run all migrations and seed the database
await initializeDatabase();
```

Alternatively, you can run migrations manually by visiting the API endpoint:

```
GET /api/db-init
```

## Database Schema Overview

The schema supports the following key features:

1. **User Management**: Store user information and authentication details
2. **Account Management**: Support for personal and shared budget accounts
3. **Multi-Category Expenses**: Expenses can be assigned to multiple categories
4. **Conversation History**: Store chat conversations by account
5. **Receipt Attachments**: Store uploaded receipt images
6. **Sharing & Collaboration**: Invitation system for account sharing

## Helpful Views and Functions

The migrations create several useful database views and functions:

- `user_accounts`: View that joins users, accounts, and roles
- `expense_with_categories`: View that shows expenses with their categories
- `add_expense_with_categories()`: Function to add an expense with categories
- `get_expenses_by_period()`: Function to get expenses for a time period
- `get_spending_by_category()`: Function to get spending by category

## Environment Setup

Make sure your `.env.local` file contains the Neon database connection string:

```
NEON_DATABASE_URL=postgres://user:password@hostname/database
```
