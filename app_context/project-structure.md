# Rico Project Structure

## Directory Overview

- **src/app**: Next.js application routes and API endpoints
  - **(main)**: Main application pages
  - **api**: Backend API routes for data operations
  - **dashboard**: Dashboard related pages
  - **settings**: Settings pages
  - **join**: Account joining functionality
  - **sign-in/sign-up**: Authentication pages

- **src/components**: UI components
  - **account**: Account-related components
  - **auth**: Authentication components
  - **chat**: Chat interface components
  - **layout**: Layout components (header, footer, etc.)
  - **ui**: Reusable UI components
  - **user**: User-related components
  
- **src/contexts**: React context providers
  - **account-context.tsx**: Account state management
  - **theme-context.tsx**: Theme state management
  
- **src/db**: Database related code
  - **migrations**: Database migration scripts
  - **schema.ts**: Zod schemas for database entities
  
- **src/hooks**: Custom React hooks
  
- **src/lib**: Utility functions and libraries

## Key Files

- **src/middleware.ts**: Next.js middleware for route protection and authentication
- **src/stack.tsx**: Stack Auth integration for authentication
- **src/contexts/account-context.tsx**: Manages account state, switching, creation, and deletion
- **src/db/schema.ts**: Defines data models using Zod schemas

## Application Flow

1. Authentication via @stackframe/stack (configured in stack.tsx)
2. Account management via AccountContext
3. Protected routes handled by middleware.ts
4. API endpoints in src/app/api handle data operations
5. UI components render data and handle user interactions

## Routing Structure

- **/** - Main page/dashboard
- **/settings** - User and account settings
- **/join** - Join shared accounts
- **/sign-in, /sign-up** - Authentication
- **/api/...** - Backend API endpoints

## Code Conventions

- TypeScript for type safety
- React Server Components where possible
- Client Components marked with 'use client'
- Tailwind CSS for styling
- Radix UI for accessible components
