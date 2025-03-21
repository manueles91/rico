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
import { PlusCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface AccountSelectorProps {
  className?: string;
}

export function AccountSelector({ className }: AccountSelectorProps) {
  const { accounts, currentAccount, isLoading, switchAccount, refreshAccounts } = useAccount();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountDescription, setNewAccountDescription] = useState('');
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
          isPersonal: true, // For now, all new accounts are personal
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
          description: 'Account created successfully',
        });

        // Reset form
        setNewAccountName('');
        setNewAccountDescription('');
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Create a new account to manage your finances separately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g. Personal Account"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newAccountDescription}
                onChange={(e) => setNewAccountDescription(e.target.value)}
                placeholder="e.g. My personal finances"
              />
            </div>
          </div>
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
