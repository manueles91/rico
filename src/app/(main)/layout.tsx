'use client';

import { UserButton } from '@/components/auth/user-button';
import { AccountSelector } from '@/components/account/account-selector';
import { useAccount } from '@/contexts/account-context';
import { AccountProvider } from '@/contexts/account-context';
import { ThemeToggle } from '@/components/theme/theme-toggle';
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
      <header className="border-b py-3">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Rico</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
      <header className="border-b py-3">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Rico</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full"></div>
            <div className="w-40 h-10 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </header>
      <div className="flex-1 p-8">
        <div className="w-full h-[80vh] bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    </main>
  );
}
