'use client';

import { AccountSelector } from '@/components/account/account-selector';
import { useAccount } from '@/contexts/account-context';
import { AccountProvider } from '@/contexts/account-context';
import { UserDropdown } from '@/components/layout/user-dropdown';
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
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b py-3 bg-background dark:bg-background text-foreground dark:text-foreground">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-foreground dark:text-foreground">Rico</h1>
          <div className="flex-1 mx-8">
            {!isAccountLoading && <AccountSelector />}
          </div>
          <div className="flex items-center gap-3">
            <UserDropdown />
          </div>
        </div>
      </header>
      <div className="flex-1 bg-background dark:bg-background text-foreground dark:text-foreground">
        {children}
      </div>
    </main>
  );
}

function MainLayoutSkeleton() {
  return (
    <main className="min-h-screen flex flex-col bg-background dark:bg-background">
      <header className="border-b py-3 bg-background dark:bg-background">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-foreground dark:text-foreground">Rico</h1>
          <div className="flex-1 mx-8">
            <div className="w-40 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full"></div>
          </div>
        </div>
      </header>
      <div className="flex-1 p-8 bg-background dark:bg-background">
        <div className="w-full h-[80vh] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
      </div>
    </main>
  );
}
