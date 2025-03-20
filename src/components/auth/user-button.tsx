'use client';

import { useState } from 'react';
import { UserButton as StackUserButton } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';

export function UserButton() {
  const { user, isLoading } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        Loading...
      </Button>
    );
  }
  
  if (!user) {
    return (
      <Link href="/sign-in">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </Link>
    );
  }
  
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            Dashboard
          </Button>
        </Link>
        <StackUserButton />
      </div>
    </div>
  );
}
