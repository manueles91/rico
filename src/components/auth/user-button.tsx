'use client';

import { useState } from 'react';
import { UserButton as StackUserButton } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from 'lucide-react';

export function UserButton() {
  const { user, isLoading } = useCurrentUser();
  
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-9 sm:h-10">
        Loading...
      </Button>
    );
  }
  
  if (!user) {
    return (
      <Link href="/sign-in">
        <Button variant="outline" size="sm" className="h-9 sm:h-10">
          Sign In
        </Button>
      </Link>
    );
  }
  
  return (
    <div className="relative flex items-center">
      <div className="mr-1 sm:mr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <User className="h-4 w-4" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer">Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/handler/account" className="cursor-pointer">Account Settings</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <StackUserButton />
    </div>
  );
}
