'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccount } from '@/contexts/account-context';
import { Loader2 } from 'lucide-react';

interface AccountSelectorProps {
  className?: string;
}

export function AccountSelector({ className }: AccountSelectorProps) {
  const { accounts, currentAccount, isLoading, switchAccount } = useAccount();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading accounts...</span>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return null;
  }

  // If there's only one account, don't show the selector
  if (accounts.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm font-medium">{accounts[0].name}</span>
      </div>
    );
  }

  return (
    <Select
      value={currentAccount?.id}
      onValueChange={switchAccount}
    >
      <SelectTrigger className={`h-9 w-[180px] ${className}`}>
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
            {account.is_personal && ' (Personal)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
