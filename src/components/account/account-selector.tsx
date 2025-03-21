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
  const { accounts, currentAccount, isLoading, switchAccount, refreshAccounts, createAccount, generateShareableLink } = useAccount();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountDescription, setNewAccountDescription] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'shared'>('personal');
  const [isCreating, setIsCreating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

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
      const newAccount = await createAccount(
        newAccountName.trim(),
        newAccountDescription.trim() || `Account for ${newAccountName.trim()}`,
        accountType === 'personal'
      );

      if (newAccount) {
        // If it's a shared account, generate a shareable link
        if (accountType === 'shared') {
          const link = await generateShareableLink(newAccount.id);
          if (link) {
            setShareLink(link);
          }
        } else {
          // Reset form and close dialog for personal accounts
          resetForm();
        }
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error',
        description: `Failed to create account: ${(error as Error).message}`,
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewAccountName('');
    setNewAccountDescription('');
    setAccountType('personal');
    setShareLink(null);
    setIsLinkCopied(false);
    setIsCreateDialogOpen(false);
    setIsCreating(false);
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsLinkCopied(true);
      
      toast({
        title: 'Link copied',
        description: 'The invitation link has been copied to your clipboard.',
      });
      
      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy the link. Please try again.',
        variant: 'destructive',
      });
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

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsCreateDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Create a new account to manage your finances separately.
            </DialogDescription>
          </DialogHeader>
          
          {shareLink ? (
            // Show shareable link after account creation
            <div className="py-4">
              <div className="mb-4 p-4 rounded-md bg-primary/10 text-primary">
                <h4 className="font-medium mb-2">Account Created Successfully!</h4>
                <p className="text-sm">
                  Share this link with others to invite them to join your shared account.
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="share-link">Invitation Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    value={shareLink}
                    readOnly
                    className="flex-1 font-mono text-xs"
                  />
                  <Button 
                    onClick={handleCopyLink} 
                    variant={isLinkCopied ? "outline" : "default"}
                    className="shrink-0"
                  >
                    {isLinkCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This link will expire in 30 days. Anyone with this link can join your account.
                </p>
              </div>
              
              <div className="mt-6">
                <Button onClick={resetForm} className="w-full">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            // Show account creation form
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
                      <p className="text-sm">
                        After creating the account, you'll get a shareable link to invite others.
                      </p>
                    </div>
                  )}
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
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
