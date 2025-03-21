'use client';

import { AccountProvider } from '@/contexts/account-context';
import { Suspense } from 'react';

export default function JoinLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AccountProvider>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </AccountProvider>
  );
}
