'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Account } from '@/db/schema';
import Cookies from 'js-cookie';
import { toast } from '@/components/ui/use-toast';

interface AccountContextType {
  accounts: Account[];
  currentAccount: Account | null;
  isLoading: boolean;
  error: Error | null;
  switchAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isUserLoading, stackUser } = useCurrentUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  // Function to fetch user accounts
  const fetchAccounts = async () => {
    if (!user) {
      setAccounts([]);
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      // Directly fetch the accounts without doing environment checks
      const response = await fetch(`/api/accounts?userId=${user.id}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Accounts API response error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch accounts');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setAccounts(data.data);
        
        // Get current account ID from cookie
        const currentAccountId = Cookies.get('currentAccountId');
        
        // Find the current account in the list
        if (currentAccountId) {
          const account = data.data.find((a: Account) => a.id === currentAccountId);
          if (account) {
            setCurrentAccount(account);
          } else if (data.data.length > 0) {
            // If the account in the cookie doesn't exist, use the first account
            setCurrentAccount(data.data[0]);
            Cookies.set('currentAccountId', data.data[0].id, { expires: 30 });
          }
        } else if (data.data.length > 0) {
          // If no cookie exists, use the first account
          setCurrentAccount(data.data[0]);
          Cookies.set('currentAccountId', data.data[0].id, { expires: 30 });
        }
      } else {
        // If no accounts were returned, we might need to create a personal account
        if (stackUser) {
          toast({
            title: 'Creating personal account',
            description: 'No accounts found. Creating a personal account for you.',
          });
          
          // Create a personal account for the user
          try {
            const createResponse = await fetch('/api/accounts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: `${user.name || 'Personal'}'s Account`,
                description: 'Your personal account',
                isPersonal: true,
              }),
            });
            
            if (!createResponse.ok) {
              const createErrorData = await createResponse.json();
              console.error('Error creating personal account:', createErrorData);
              throw new Error(createErrorData.message || 'Failed to create personal account');
            }
            
            const createData = await createResponse.json();
            console.log('Personal account created:', createData);
            
            if (createData.success && createData.data) {
              setAccounts([createData.data]);
              setCurrentAccount(createData.data);
              Cookies.set('currentAccountId', createData.data.id, { expires: 30 });
              
              toast({
                title: 'Personal account created',
                description: 'Your personal account has been created successfully.',
              });
            }
          } catch (createError) {
            console.error('Error creating personal account:', createError);
            toast({
              title: 'Error',
              description: `Failed to create personal account: ${(createError as Error).message}`,
              variant: 'destructive',
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching accounts:', err);
      
      toast({
        title: 'Error',
        description: `Failed to fetch accounts: ${(err as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user accounts when the user is loaded
  useEffect(() => {
    if (!isUserLoading) {
      fetchAccounts();
    }
  }, [user, isUserLoading]);

  // Function to switch between accounts
  const switchAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
      setCurrentAccount(account);
      Cookies.set('currentAccountId', accountId, { expires: 30 });
      
      // Refresh the page to update the context
      router.refresh();
    }
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        currentAccount,
        isLoading: isLoading || isUserLoading,
        error,
        switchAccount,
        refreshAccounts: fetchAccounts,
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
