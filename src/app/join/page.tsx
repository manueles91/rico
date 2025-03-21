'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { useAccount } from '@/contexts/account-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SignIn } from '@stackframe/stack';
import { toast } from '@/components/ui/use-toast';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const accountId = searchParams.get('accountId');
  const user = useUser();
  const { refreshAccounts, switchAccount } = useAccount();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  useEffect(() => {
    const validateInvitation = async () => {
      if (!token || !accountId) {
        setError('Invalid invitation link. Please request a new one.');
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/accounts/${accountId}/validate-share?token=${token}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setAccountName(data.data.accountName);
        } else {
          setError(data.message || 'Invalid or expired invitation link.');
        }
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError('An error occurred while validating the invitation.');
      } finally {
        setIsLoading(false);
      }
    };
    
    validateInvitation();
  }, [token, accountId]);
  
  const handleJoinAccount = async () => {
    if (!token || !accountId || !user) return;
    
    setIsJoining(true);
    
    try {
      const response = await fetch(`/api/accounts/${accountId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: `You have successfully joined the ${accountName} account.`,
        });
        
        // Refresh accounts and switch to the joined account
        await refreshAccounts();
        switchAccount(accountId);
        
        // Redirect to the main page
        router.push('/');
      } else {
        setError(data.message || 'Failed to join the account.');
      }
    } catch (err) {
      console.error('Error joining account:', err);
      setError('An error occurred while joining the account.');
    } finally {
      setIsJoining(false);
    }
  };
  
  // If user is not signed in, show sign in form
  if (!user) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to join</CardTitle>
            <CardDescription>
              You need to sign in or create an account to join this shared account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignIn />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Join Shared Account</CardTitle>
          <CardDescription>
            You've been invited to join a shared account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle size={20} />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p>
                You've been invited to join <strong>{accountName}</strong> as a member.
              </p>
              <p className="text-sm text-muted-foreground">
                By joining, you'll be able to view and manage finances in this shared account.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          {!isLoading && !error && (
            <Button 
              onClick={handleJoinAccount} 
              disabled={isJoining}
              className="w-full"
            >
              <UserPlus size={16} className="mr-2" />
              {isJoining ? 'Joining...' : 'Join Account'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
