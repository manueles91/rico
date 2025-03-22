# Rico Database Schema

## Core Entities

### Users
- **id**: UUID, primary key
- **email**: User's email address
- **name**: User's display name (nullable)
- **avatar_url**: URL to user's avatar image (nullable)
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Accounts
- **id**: UUID, primary key
- **name**: Account name
- **description**: Account description (nullable)
- **is_personal**: Boolean flag for personal/shared accounts
- **created_by**: UUID of user who created the account
- **created_at**: Timestamp
- **updated_at**: Timestamp (nullable)
- **is_deleted**: Boolean flag for soft deletion
- **deleted_at**: Timestamp for deletion date (nullable)

### Account Members
- **id**: UUID, primary key
- **user_id**: UUID reference to users
- **account_id**: UUID reference to accounts
- **role**: Enum ('owner', 'editor', 'viewer')
- **created_at**: Timestamp

## Financial Data

### Categories
- **id**: UUID, primary key
- **account_id**: UUID reference to accounts
- **name**: Category name
- **icon**: Icon identifier (nullable)
- **color**: Color code (nullable)
- **created_at**: Timestamp
- **created_by**: UUID of user who created the category (nullable)

### Expenses
- **id**: UUID, primary key
- **account_id**: UUID reference to accounts
- **amount**: Positive number
- **description**: Text description (nullable)
- **vendor**: Vendor name (nullable)
- **date**: Timestamp
- **created_by**: UUID of user who created the expense (nullable)
- **created_at**: Timestamp
- **updated_at**: Timestamp
- **receipt_url**: URL to receipt image (nullable)
- **metadata**: JSON data (nullable)

### Expense Categories (Junction Table)
- **id**: UUID, primary key
- **expense_id**: UUID reference to expenses
- **category_id**: UUID reference to categories
- **created_at**: Timestamp

## Chat System

### Conversations
- **id**: UUID, primary key
- **account_id**: UUID reference to accounts
- **title**: Conversation title (nullable)
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Messages
- **id**: UUID, primary key
- **conversation_id**: UUID reference to conversations
- **user_id**: UUID reference to users (nullable for AI messages)
- **is_from_ai**: Boolean flag
- **content**: Message content (nullable)
- **created_at**: Timestamp
- **metadata**: JSON data (nullable)

### Attachments
- **id**: UUID, primary key
- **message_id**: UUID reference to messages
- **file_url**: URL to attached file
- **file_type**: MIME type or file type
- **created_at**: Timestamp

## Sharing System

### Invitations
- **id**: UUID, primary key
- **account_id**: UUID reference to accounts
- **email**: Invitee email address
- **role**: Enum ('editor', 'viewer')
- **token**: Invitation token
- **invited_by**: UUID of inviting user (nullable)
- **created_at**: Timestamp
- **expires_at**: Timestamp
- **accepted_at**: Timestamp (nullable)

### Shareable Links
- **id**: UUID, primary key
- **account_id**: UUID reference to accounts
- **token**: Share token
- **created_by**: UUID of user who created the link
- **expires_at**: Timestamp
- **created_at**: Timestamp
- **updated_at**: Timestamp (nullable)

## Key Relationships

- Users can have multiple Accounts through Account Members
- Accounts can have multiple Categories and Expenses
- Expenses can have multiple Categories through ExpenseCategory
- Accounts can have multiple Conversations
- Conversations can have multiple Messages
- Messages can have multiple Attachments
- Accounts can have multiple Invitations and Shareable Links
