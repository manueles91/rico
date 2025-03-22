# Rico State Management

## Account Context

The application uses React Context API for state management, with the main context being the Account Context.

### Key Components

- **AccountProvider**: Wraps the application to provide account-related state
- **useAccount**: Custom hook to access account context

### State Variables

- **accounts**: Array of all user accounts
- **currentAccount**: Currently selected account
- **isLoading**: Loading state for account operations
- **error**: Any error that occurred during account operations

### Functions

- **switchAccount(accountId)**: Switch to a different account
- **refreshAccounts()**: Refresh the list of user accounts
- **createAccount(name, description, isPersonal, invitedEmails)**: Create a new account
- **generateShareableLink(accountId)**: Generate a shareable link for an account
- **deleteAccount(accountId)**: Delete/remove an account (soft deletion)

### Flow

1. On initial load, the provider fetches all accounts for the authenticated user
2. If no accounts exist, a personal account is automatically created
3. Account state is persisted in cookies (`currentAccountId`)
4. Account switching causes a page refresh to update the context

## Theme Context

Simple context for managing light/dark theme preferences.

### State Variables

- **theme**: Current theme ('light' or 'dark')
- **systemTheme**: Theme detected from system preferences

### Functions

- **setTheme(theme)**: Set the theme manually
- **toggleTheme()**: Toggle between light and dark modes

## Authentication

Authentication is handled by Stack Auth (@stackframe/stack).

### Key Components

- **StackServerApp**: Configured in src/stack.tsx
- **StackProvider**: Wraps the application in layout.tsx

### Authentication Flow

1. User signs in through Stack Auth UI
2. Auth state is managed by Stack Auth
3. Protected routes check auth state via middleware
4. User data is accessed through useUser() hook or stackServerApp.getUser()

## Data Fetching

Rico follows these patterns for data fetching:

1. **API Routes**: Defined in src/app/api/
2. **Server Components**: Fetch data directly on the server when possible
3. **Client Components**: Use fetch API for data fetching

### Error Handling

- Toast notifications for user feedback
- Console errors for debugging
- Error state in contexts to reflect error conditions in UI
