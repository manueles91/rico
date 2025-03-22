# Rico API Endpoints

## Authentication

- **GET /api/auth/check**
  - Check if user is authenticated
  - Returns user object if authenticated

- **GET /api/auth/user**
  - Get current user data
  - Returns user details and preferences

- **POST /api/auth/webhook**
  - Stack Auth webhook endpoint
  - Handles authentication events

## Accounts

- **GET /api/accounts**
  - Get all accounts for authenticated user
  - Query params: `userId` (optional)

- **POST /api/accounts**
  - Create a new account
  - Body: `name`, `description`, `isPersonal`, `generateShareableLink`

- **GET /api/accounts/check**
  - Check for existing accounts for a user
  - Query params: `userId`

- **GET /api/accounts/[accountId]**
  - Get account details by ID
  - Returns account data and membership info

- **DELETE /api/accounts/[accountId]**
  - Delete/remove account (soft deletion)
  - For personal accounts: marks as deleted
  - For shared accounts: removes user from members

- **POST /api/accounts/[accountId]/share**
  - Generate shareable link for an account
  - Returns share token and expiration

- **GET /api/accounts/[accountId]/validate-share**
  - Validate a shareable link token
  - Query params: `token`

- **POST /api/accounts/[accountId]/join**
  - Join an account via shareable link
  - Body: `token`

- **GET /api/accounts/[accountId]/members**
  - Get all members of an account
  - Returns list of users with roles

## Expenses

- **GET /api/expenses**
  - Get expenses for current account
  - Query params: `accountId`, `limit`, `offset`, `search`

- **POST /api/expenses**
  - Create a new expense
  - Body: `accountId`, `amount`, `description`, `vendor`, `date`, `receipt`, `categoryIds`

- **GET /api/expenses/[id]**
  - Get expense details by ID
  - Returns expense with categories

- **PUT /api/expenses/[id]**
  - Update an expense
  - Body: Same as POST, plus `id`

- **DELETE /api/expenses/[id]**
  - Delete an expense
  - Returns success status

- **GET /api/expenses/count**
  - Get expense count for current account
  - Query params: `accountId`

## Categories

- **GET /api/categories**
  - Get categories for current account
  - Query params: `accountId`

- **POST /api/categories**
  - Create a new category
  - Body: `accountId`, `name`, `icon`, `color`

- **GET /api/categories/[id]**
  - Get category details by ID
  - Returns category data

- **PUT /api/categories/[id]**
  - Update a category
  - Body: Same as POST, plus `id`

- **DELETE /api/categories/[id]**
  - Delete a category
  - Returns success status

## Chat

- **GET /api/conversations**
  - Get all conversations for current account
  - Query params: `accountId`

- **POST /api/conversations**
  - Create a new conversation
  - Body: `accountId`, `title`

- **GET /api/conversations/[id]**
  - Get conversation details by ID
  - Returns conversation with messages

- **DELETE /api/conversations/[id]**
  - Delete a conversation
  - Returns success status

- **GET /api/conversations/[id]/messages**
  - Get all messages for a conversation
  - Query params: `limit`, `offset`

- **GET /api/conversations/latest**
  - Get most recent conversation
  - Query params: `accountId`

- **POST /api/chat**
  - Send a message to chat
  - Body: `conversationId`, `content`, `accountId`

- **POST /api/chat/image-upload**
  - Upload an image to a chat message
  - Form data: `file`, `conversationId`

- **GET /api/messages/[id]**
  - Get message details by ID
  - Returns message with attachments

## Database Management

- **GET /api/db-init**
  - Initialize database tables and run migrations
  - Requires authentication in production
  - Creates core database tables
  - Runs all migrations from the migrations directory
  - Seeds initial data if needed

- **GET /api/setup-rls**
  - Setup Row Level Security policies
  - Creates row-level security policies for all tables

- **GET /api/test-db**
  - Test database connection
  - Returns connection status and environment variable check

- **GET /api/list-tables**
  - List all database tables
  - Returns detailed table structure including columns and data types

## Testing Endpoints (Development Only)

- **GET /api/test-auth**
  - Test authentication
  - Returns auth status

- **GET /api/test-env**
  - Test environment variables
  - Returns environment configuration

- **GET /api/test-rls**
  - Test Row Level Security
  - Returns RLS status

- **GET /api/test-blob**
  - Test Vercel Blob storage
  - Returns blob status

<span style="color:gray; font-size:0.9em;">Note: Redundant endpoints (init-db, setup-db, db-test, test-tables) have been removed from the codebase to reduce duplication and improve maintainability.</span>
