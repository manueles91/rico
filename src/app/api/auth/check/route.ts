import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

export async function GET() {
  try {
    // Check Stack Auth configuration
    const stackAuthConfigured = !!(
      process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY &&
      process.env.STACK_SECRET_SERVER_KEY
    );
    
    // Try to get the user without throwing an error
    let user = null;
    let userError = null;
    
    try {
      user = await stackServerApp.getUser({ or: 'return-null' });
    } catch (error) {
      userError = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error);
    }
    
    return NextResponse.json({
      success: true,
      stackAuthConfigured,
      stackAuthConfig: {
        projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID ? 'Set' : 'Not set',
        publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ? 'Set' : 'Not set',
        secretServerKey: process.env.STACK_SECRET_SERVER_KEY ? 'Set' : 'Not set',
      },
      user: user ? {
        id: user.id,
        email: user.primaryEmail,
        name: user.displayName,
      } : null,
      userError,
    });
  } catch (error) {
    console.error('Stack Auth check error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Stack Auth check failed',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
}
