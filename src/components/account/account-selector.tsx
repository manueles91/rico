'use client';

import React from 'react';
import { useAccount } from '@/contexts/account-context';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountSelectorProps {
  className?: string;
}

export function AccountSelector({ className }: AccountSelectorProps) {
  const { accounts, currentAccount, isLoading, switchAccount } = useAccount();

  if (isLoading) {
    return <Skeleton className={`h-9 w-[140px] sm:w-[180px] ${className}`} />;
  }

  if (!accounts.length) {
    return null;
  }

  return (
    <Select
      value={currentAccount?.id}
      onValueChange={switchAccount}
    >
      <SelectTrigger className={`w-[140px] sm:w-[180px] h-9 sm:h-10 text-sm sm:text-base ${className}`}>
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
      </SelectContent>
    </Select>
  );
}
