# Code Organization

This document outlines the organization and structure of the Rico codebase, highlighting key architectural decisions and code organization patterns.

## Modular Architecture

The Rico project follows a modular architecture pattern, separating concerns into distinct modules:

### Chat Module

The chat functionality has been refactored into a modular structure with the following components:

- `src/lib/chat/types.ts` - Type definitions for chat-related data structures
- `src/lib/chat/db-operations.ts` - Database operations for chat functionality
- `src/lib/chat/openai-service.ts` - OpenAI API integration for chat completions
- `src/lib/chat/expense-processor.ts` - Processing expenses extracted from chat
- `src/lib/chat/index.ts` - Exports from all chat modules

This modular approach improves:
- **Maintainability**: Each module has a single responsibility
- **Testability**: Modules can be tested in isolation
- **Readability**: Smaller, focused files are easier to understand
- **Reusability**: Functions can be reused across different parts of the application

### API Endpoints

API endpoints have been consolidated to reduce duplication:

- **Database Management**:
  - `/api/db-init` - Single endpoint for database initialization
  - `/api/setup-rls` - Row Level Security setup
  - `/api/test-db` - Database connection testing
  - `/api/list-tables` - Table listing and schema information

Redundant endpoints have been removed to simplify the codebase.

## Code Organization Principles

1. **Separation of Concerns**: Each module handles a specific aspect of functionality
2. **Single Responsibility**: Files and functions have a single, well-defined purpose
3. **DRY (Don't Repeat Yourself)**: Common functionality is extracted into reusable modules
4. **Progressive Enhancement**: Core functionality works without dependencies, with enhanced features when available

## Folder Structure

```
src/
├── app/                  # Next.js app router pages and API routes
│   ├── api/              # API endpoints
│   └── ...               # App routes
├── components/           # React components
│   ├── account/          # Account-related components
│   ├── chat/             # Chat interface components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── contexts/             # React context providers
├── db/                   # Database setup and migrations
├── lib/                  # Shared libraries and utilities
│   ├── chat/             # Chat functionality modules
│   └── ...               # Other utility modules
└── types/                # TypeScript type definitions
```

## Best Practices

1. **Modular Design**: Break down complex functionality into smaller, manageable modules
2. **Type Safety**: Use TypeScript interfaces and types for better code quality
3. **Error Handling**: Implement consistent error handling patterns
4. **Authentication**: Secure endpoints with proper authentication checks
5. **Database Access**: Use parameterized queries to prevent SQL injection
6. **Code Comments**: Document complex logic and important decisions
