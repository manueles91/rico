'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Account } from '@/db/schema';
import Cookies from 'js-cookie';
import { toast } from '@/components/ui/use-toast';

// Types
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

interface AccountContextType {
  accounts: Account[];
  currentAccount: Account | null;
  isLoading: boolean;
  error: Error | null;
  switchAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
  createAccount: (name: string, description: string, isPersonal?: boolean, invitedEmails?: string[]) => Promise<Account | null>;
  generateShareableLink: (accountId: string) => Promise<string | null>;
  deleteAccount: (accountId: string) => Promise<boolean>;
}

// Custom error class for account-related errors
class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountError';
  }
}

// API service functions
const accountApi = {
  /**
   * Fetches all accounts for a user
   */
  async fetchUserAccounts(userId: string): Promise<ApiResponse<Account[]>> {
    const response = await fetch(`/api/accounts?userId=${userId}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new AccountError(errorData.message || 'Failed to fetch accounts');
    }
    
    return await response.json();
  },

  /**
   * Checks if a user has any existing accounts
   */
  async checkExistingAccounts(userId: string): Promise<ApiResponse<Account[]>> {
    const response = await fetch(`/api/accounts/check?userId=${userId}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new AccountError(errorData.message || 'Failed to check for existing accounts');
    }
    
    return await response.json();
  },

  /**
   * Creates a new account
   */
  async createAccount(
    data: { 
      name: string; 
      description: string; 
      isPersonal?: boolean; 
      generateShareableLink?: boolean;
    }
  ): Promise<ApiResponse<Account>> {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new AccountError(errorData.message || 'Failed to create account');
    }
    
    return await response.json();
  },

  /**
   * Generates a shareable link for an account
   */
  async generateShareableLink(accountId: string): Promise<ApiResponse<{ shareLink: string }>> {
    const response = await fetch(`/api/accounts/${accountId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new AccountError(errorData.message || 'Failed to generate shareable link');
    }
    
    return await response.json();
  },

  /**
   * Deletes an account (or removes user's access)
   */
  async deleteAccount(accountId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`/api/accounts/${accountId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new AccountError(errorData.message || 'Failed to delete account');
    }
    
    return await response.json();
  },
};

// Create context
const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isUserLoading, stackUser } = useCurrentUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  /**
   * Sets the current account and updates the cookie
   */
  const setActiveAccount = (account: Account) => {
    setCurrentAccount(account);
    Cookies.set('currentAccountId', account.id, { expires: 30 });
  };

  /**
   * Handles API errors with consistent error messaging
   */
  const handleApiError = (err: unknown, action: string) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    setError(err instanceof Error ? err : new Error(errorMessage));
    console.error(`Error ${action}:`, err);
    
    toast({
      title: 'Error',
      description: `Failed to ${action}: ${errorMessage}`,
      variant: 'destructive',
    });
  };

  /**
   * Creates a personal account for the user
   */
  const createPersonalAccount = async (): Promise<Account | null> => {
    if (!user) return null;

    try {
      toast({
        title: 'Creating personal account',
        description: 'No accounts found. Creating a personal account for you.',
      });
      
      const createData = await accountApi.createAccount({
        name: `${user.name || 'Personal'}'s Account`,
        description: 'Your personal account',
        isPersonal: true,
      });
      
      if (createData.success && createData.data) {
        const newAccount = createData.data;
        setAccounts([newAccount]);
        setActiveAccount(newAccount);
        
        toast({
          title: 'Personal account created',
          description: 'Your personal account has been created successfully.',
        });
        
        return newAccount;
      }
    } catch (err) {
      handleApiError(err, 'creating personal account');
    }
    
    return null;
  };

  /**
   * Checks for existing accounts and creates a personal one if none exist
   */
  const handleNoAccounts = async () => {
    if (!stackUser || !user) return;
    
    try {
      toast({
        title: 'Checking for accounts',
        description: 'Checking if you already have an account...',
      });
      
      const checkData = await accountApi.checkExistingAccounts(user.id);
      
      if (checkData.success && checkData.data && checkData.data.length > 0) {
        // User has existing accounts, use them
        setAccounts(checkData.data);
        setActiveAccount(checkData.data[0]);
        
        toast({
          title: 'Account found',
          description: 'Using your existing account.',
        });
        return;
      }
      
      // No existing accounts found, create a personal one
      await createPersonalAccount();
    } catch (err) {
      handleApiError(err, 'checking for existing accounts');
    }
  };

  /**
   * Handles account selection based on cookie or available accounts
   */
  const selectActiveAccount = (availableAccounts: Account[]) => {
    if (availableAccounts.length === 0) return;
    
    const currentAccountId = Cookies.get('currentAccountId');
    
    if (currentAccountId) {
      const account = availableAccounts.find(a => a.id === currentAccountId);
      if (account) {
        setActiveAccount(account);
      } else {
        // If the account in cookie doesn't exist, use the first account
        setActiveAccount(availableAccounts[0]);
      }
    } else {
      // If no cookie exists, use the first account
      setActiveAccount(availableAccounts[0]);
    }
  };

  /**
   * Fetches user accounts
   */
  const fetchAccounts = async () => {
    if (!user) {
      setAccounts([]);
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await accountApi.fetchUserAccounts(user.id);
      
      if (data.success && data.data) {
        setAccounts(data.data);
        
        if (data.data.length > 0) {
          selectActiveAccount(data.data);
        } else {
          // If no accounts were returned, check for existing or create a personal account
          await handleNoAccounts();
        }
      }
    } catch (err) {
      handleApiError(err, 'fetching accounts');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Creates a new account
   */
  const createAccount = async (
    name: string, 
    description: string, 
    isPersonal: boolean = true, 
    invitedEmails: string[] = []
  ): Promise<Account | null> => {
    try {
      const data = await accountApi.createAccount({
        name,
        description,
        isPersonal,
        generateShareableLink: !isPersonal,
      });
      
      if (data.success && data.data) {
        const newAccount = data.data;
        setAccounts(prevAccounts => [...prevAccounts, newAccount]);
        setActiveAccount(newAccount);
        
        toast({
          title: 'Account created',
          description: isPersonal 
            ? 'Your new personal account has been created successfully.'
            : 'Your shared account has been created successfully. You can now share the invitation link with others.',
        });
        
        return newAccount;
      }
    } catch (err) {
      handleApiError(err, 'creating account');
    }
    
    return null;
  };

  /**
   * Generates a shareable link for an account
   */
  const generateShareableLink = async (accountId: string): Promise<string | null> => {
    try {
      const data = await accountApi.generateShareableLink(accountId);
      
      if (data.success && data.data?.shareLink) {
        return data.data.shareLink;
      }
    } catch (err) {
      handleApiError(err, 'generating shareable link');
    }
    
    return null;
  };

  /**
   * Deletes an account (or removes user's access)
   */
  const deleteAccount = async (accountId: string): Promise<boolean> => {
    try {
      await accountApi.deleteAccount(accountId);
      
      // Update local state
      setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== accountId));
      
      // If the deleted account is the current account, switch to another account
      if (currentAccount?.id === accountId) {
        const remainingAccount = accounts.find(account => account.id !== accountId);
        
        if (remainingAccount) {
          setActiveAccount(remainingAccount);
        } else {
          setCurrentAccount(null);
          Cookies.remove('currentAccountId');
        }
      }
      
      toast({
        title: 'Account deleted',
        description: 'The account has been removed from your account list.',
      });
      
      return true;
    } catch (err) {
      handleApiError(err, 'deleting account');
      return false;
    }
  };

  /**
   * Switches between accounts
   */
  const switchAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
      setActiveAccount(account);
      
      // Refresh the page to update the context
      router.refresh();
    }
  };

  // Fetch user accounts when the user is loaded
  useEffect(() => {
    if (!isUserLoading) {
      fetchAccounts();
    }
  }, [user, isUserLoading]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        currentAccount,
        isLoading: isLoading || isUserLoading,
        error,
        switchAccount,
        refreshAccounts: fetchAccounts,
        createAccount,
        generateShareableLink,
        deleteAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  
  return context;
}
