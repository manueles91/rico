'use client';

import { useState } from 'react';
import { useAccount } from '@/contexts/account-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Link, Copy, Check, Users, Trash2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface AccountSettingsProps {
  className?: string;
}

export function AccountSettings({ className }: AccountSettingsProps) {
  const router = useRouter();
  const { currentAccount, generateShareableLink, deleteAccount } = useAccount();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGenerateLink = async () => {
    if (!currentAccount || currentAccount.is_personal) return;

    setIsGeneratingLink(true);

    try {
      const link = await generateShareableLink(currentAccount.id);
      if (link) {
        setShareLink(link);
        toast({
          title: 'Link generated',
          description: 'A new invitation link has been generated for this account.',
        });
      }
    } catch (err) {
      console.error('Error generating link:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate invitation link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLink(false);
    }
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

  const handleDeleteAccount = async () => {
    if (!currentAccount) return;

    setIsDeleting(true);

    try {
      const success = await deleteAccount(currentAccount.id);
      if (success) {
        setIsDeleteDialogOpen(false);
        router.push('/');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentAccount) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account settings and preferences
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Account Details</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  value={currentAccount.name}
                  readOnly
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Input
                  id="account-type"
                  value={currentAccount.is_personal ? 'Personal' : 'Shared'}
                  readOnly
                />
              </div>
            </div>
          </div>

          {!currentAccount.is_personal && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Invite Members</h3>
                <Users size={16} className="text-muted-foreground" />
              </div>

              {shareLink ? (
                <div className="space-y-2">
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
                      {isLinkCopied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This link will expire in 30 days. Anyone with this link can join your account.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Generate a shareable link to invite others to join this account.
                  </p>
                  <Button
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink}
                    variant="outline"
                    className="w-full"
                  >
                    <Link size={16} className="mr-2" />
                    {isGeneratingLink ? 'Generating...' : 'Generate Invitation Link'}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-lg font-medium text-destructive flex items-center gap-2">
              <Trash2 size={16} />
              Danger Zone
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Once you delete an account, you will lose access to it and all associated data.
              {!currentAccount.is_personal && " Other members will still have access to the account."}
            </p>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
              className="w-full"
            >
              <Trash2 size={16} className="mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account?
              {currentAccount.is_personal
                ? " This will remove your access to all data in this account."
                : " You will be removed from this account, but other members will still have access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
