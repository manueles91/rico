'use client';

import { useUser } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface UserSettingsProps {
  className?: string;
}

export function UserSettings({ className }: UserSettingsProps) {
  const user = useUser();
  
  if (!user) {
    return <Skeleton className="h-[300px] w-full" />;
  }
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>
            Manage your personal information and preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={user.displayName || ''}
                  readOnly
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.primaryEmail || ''}
                  readOnly
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
