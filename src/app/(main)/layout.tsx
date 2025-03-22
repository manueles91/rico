'use client';

import { AccountSelector } from '@/components/account/account-selector';
import { useAccount } from '@/contexts/account-context';
import { AccountProvider } from '@/contexts/account-context';
import { UserDropdown } from '@/components/layout/user-dropdown';
import { Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AccountProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true} disableTransitionOnChange={false}>
        <Suspense fallback={<MainLayoutSkeleton />}>
          <MainLayoutContent>{children}</MainLayoutContent>
        </Suspense>
      </ThemeProvider>
    </AccountProvider>
  );
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading: isAccountLoading } = useAccount();

  return (
    <main className="min-h-screen flex flex-col bg-gray-950 dark:bg-black text-black dark:text-white">
      <header className="flex items-center justify-between p-4 bg-gray-900 dark:bg-gray-900 rounded-b-xl shadow-md">
        <div className="flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Rico
          </h1>
        </div>
        <div className="flex-1 mx-8">
          {!isAccountLoading && <AccountSelector />}
        </div>
        <div className="flex items-center gap-3">
          <UserDropdown />
        </div>
      </header>
      <div className="flex-1 bg-gradient-to-b from-gray-950 to-gray-900 dark:from-black dark:to-gray-900 text-foreground dark:text-foreground">
        {children}
      </div>
    </main>
  );
}

function MainLayoutSkeleton() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-950 dark:bg-black">
      <header className="flex items-center justify-between p-4 bg-gray-900 dark:bg-gray-900 rounded-b-xl shadow-md">
        <div className="flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Rico
          </h1>
        </div>
        <div className="flex-1 mx-8">
          <div className="w-40 h-10 bg-gray-800 dark:bg-gray-800 animate-pulse rounded-full"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 dark:bg-gray-800 animate-pulse rounded-full"></div>
        </div>
      </header>
      <div className="flex-1 bg-gradient-to-b from-gray-950 to-gray-900 dark:from-black dark:to-gray-900">
        <div className="container mx-auto max-w-4xl py-4 px-3 sm:py-6 sm:px-4">
          <div className="w-full h-[80vh] bg-gray-800 dark:bg-gray-800 animate-pulse rounded-lg"></div>
        </div>
      </div>
    </main>
  );
}
