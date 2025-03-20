import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

export async function middleware(request: NextRequest) {
  try {
    // Skip authentication for public routes
    if (
      request.nextUrl.pathname.startsWith('/handler') ||
      request.nextUrl.pathname.startsWith('/api/auth') ||
      request.nextUrl.pathname === '/sign-in' ||
      request.nextUrl.pathname === '/sign-up'
    ) {
      return NextResponse.next();
    }

    // Get the user from Stack Auth
    const stackUser = await stackServerApp.getUser();

    if (!stackUser) {
      // User is not authenticated, proceed normally
      return NextResponse.next();
    }

    // Add the current account ID to the request headers if it exists in the cookies
    const accountId = request.cookies.get('currentAccountId')?.value;
    const response = NextResponse.next();
    
    if (accountId) {
      response.headers.set('x-account-id', accountId);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    // Run on all pages except API routes, static files, and auth handlers
    '/((?!api|_next/static|_next/image|favicon.ico|handler/\\[...stack\\]).*)',
  ],
};
