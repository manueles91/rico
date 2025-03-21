'use client';

import React, { useState } from 'react';
import { useAccount } from '@/contexts/account-context';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Info, Users, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface AccountSelectorProps {
  className?: string;
}

export function AccountSelector({ className }: AccountSelectorProps) {
  const { accounts, currentAccount, isLoading, switchAccount, refreshAccounts } = useAccount();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountDescription, setNewAccountDescription] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'shared'>('personal');
  const [invitedEmails, setInvitedEmails] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (isLoading) {
    return <Skeleton className={`h-9 w-[200px] ${className}`} />;
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      toast({
        title: 'Error',
        description: 'Account name is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate emails if it's a shared account
    let emailsToInvite: string[] = [];
    if (accountType === 'shared' && invitedEmails.trim()) {
      emailsToInvite = invitedEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // Basic email validation
      const invalidEmails = emailsToInvite.filter(email => !email.includes('@') || !email.includes('.'));
      if (invalidEmails.length > 0) {
        toast({
          title: 'Invalid Emails',
          description: `The following emails appear to be invalid: ${invalidEmails.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAccountName.trim(),
          description: newAccountDescription.trim() || `Account for ${newAccountName.trim()}`,
          isPersonal: accountType === 'personal',
          invitedEmails: emailsToInvite,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create account');
      }

      const data = await response.json();

      if (data.success && data.data) {
        toast({
          title: 'Success',
          description: accountType === 'shared' && emailsToInvite.length > 0
            ? `Account created and invitations sent to ${emailsToInvite.length} email(s)`
            : 'Account created successfully',
        });

        // Reset form
        setNewAccountName('');
        setNewAccountDescription('');
        setInvitedEmails('');
        setAccountType('personal');
        setIsCreateDialogOpen(false);

        // Refresh accounts and switch to the new one
        await refreshAccounts();
        switchAccount(data.data.id);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error',
        description: `Failed to create account: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectChange = (value: string) => {
    if (value === 'create-new') {
      setIsCreateDialogOpen(true);
    } else {
      switchAccount(value);
    }
  };

  return (
    <>
      <Select
        value={currentAccount?.id}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className={`w-full max-w-[300px] h-9 text-sm ${className}`}>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Personal</SelectLabel>
            {accounts
              .filter(account => account.is_personal)
              .map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
          </SelectGroup>
          {accounts.some(account => !account.is_personal) && (
            <SelectGroup>
              <SelectLabel>Shared</SelectLabel>
              {accounts
                .filter(account => !account.is_personal)
                .map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          )}
          <SelectSeparator />
          <SelectItem value="create-new" className="text-primary">
            <div className="flex items-center gap-2">
              <PlusCircle size={16} />
              <span>Create New Account</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Create a new account to manage your finances separately.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="personal" onValueChange={(value: string) => setAccountType(value as 'personal' | 'shared')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User size={16} />
                <span>Personal</span>
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex items-center gap-2">
                <Users size={16} />
                <span>Shared</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium mr-2">Account Type</h4>
                <div className="relative group">
                  <Info size={16} className="text-muted-foreground" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                    {accountType === 'personal' ? (
                      "Personal accounts are private and only accessible by you."
                    ) : (
                      "Shared accounts allow multiple users to collaborate. Perfect for couples sharing expenses or group trips."
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder={accountType === 'personal' ? "e.g. My Personal Account" : "e.g. Family Expenses"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newAccountDescription}
                    onChange={(e) => setNewAccountDescription(e.target.value)}
                    placeholder={accountType === 'personal' ? "e.g. My personal finances" : "e.g. Shared expenses with family"}
                  />
                </div>
                
                {accountType === 'shared' && (
                  <div className="grid gap-2">
                    <Label htmlFor="emails">
                      Invite Members (comma-separated emails)
                    </Label>
                    <Textarea
                      id="emails"
                      value={invitedEmails}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInvitedEmails(e.target.value)}
                      placeholder="e.g. friend@example.com, spouse@example.com"
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Invitees will receive an email with instructions to join this account.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
