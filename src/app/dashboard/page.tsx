import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await stackServerApp.getUser({ or: 'redirect' });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Welcome, {user.displayName || user.primaryEmail}</h2>
        <p className="text-gray-600 mb-4">You are logged in with: {user.primaryEmail}</p>
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Your Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-4 rounded-md">
              <h4 className="font-medium">Email</h4>
              <p>{user.primaryEmail}</p>
            </div>
            <div className="border p-4 rounded-md">
              <h4 className="font-medium">Account Settings</h4>
              <p>
                <a href="/handler/account" className="text-blue-600 hover:underline">
                  Manage your account
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-4" />
      <div className="bg-white p-6 rounded-lg shadow-md">
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-4 w-72 mb-4" />
        <div className="mt-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-4 rounded-md">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="border p-4 rounded-md">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
