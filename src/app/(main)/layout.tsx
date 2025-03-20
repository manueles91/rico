'use client';

import { UserButton } from '@/components/auth/user-button';
import { AccountSelector } from '@/components/account/account-selector';
import { useAccount } from '@/contexts/account-context';
import { AccountProvider } from '@/contexts/account-context';
import { Suspense } from 'react';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AccountProvider>
      <Suspense fallback={<MainLayoutSkeleton />}>
        <MainLayoutContent>{children}</MainLayoutContent>
      </Suspense>
    </AccountProvider>
  );
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading: isAccountLoading } = useAccount();

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">OpenAI Chat</h1>
          <div className="flex items-center gap-4">
            {!isAccountLoading && <AccountSelector />}
            <UserButton />
          </div>
        </div>
      </header>
      <div className="flex-1">
        {children}
      </div>
    </main>
  );
}

function MainLayoutSkeleton() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">OpenAI Chat</h1>
          <div className="w-48 h-10 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </header>
      <div className="flex-1 p-8">
        <div className="w-full h-[80vh] bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    </main>
  );
}
