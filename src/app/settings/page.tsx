'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountSettings } from '@/components/account/account-settings';
import { UserSettings } from '@/components/user/user-settings';
import { Settings, User } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings size={16} />
            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User size={16} />
            <span>Profile</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
        
        <TabsContent value="profile">
          <UserSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
