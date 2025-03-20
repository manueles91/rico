import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

export async function GET() {
  try {
    // Try to get the user without throwing an error
    const user = await stackServerApp.getUser({ or: 'return-null' });
    
    // Check if Stack Auth is configured
    const stackAuthConfigured = !!(
      process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY &&
      process.env.STACK_SECRET_SERVER_KEY
    );
    
    return NextResponse.json({
      success: true,
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.primaryEmail,
        name: user.displayName,
        // Don't include sensitive information
      } : null,
      stackAuthConfigured
    });
  } catch (error) {
    console.error('Auth test error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Auth test failed',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
}
