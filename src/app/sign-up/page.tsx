'use client';

import { SignUp } from '@stackframe/stack';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
      <SignUp />
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
