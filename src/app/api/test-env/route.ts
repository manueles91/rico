import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envVars = {
      // Stack Auth
      NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID ? 'Set' : 'Not set',
      NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ? 'Set' : 'Not set',
      STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY ? 'Set' : 'Not set',
      
      // Database
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? 'Set' : 'Not set',
      
      // OpenAI
      NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Set' : 'Not set',
    };
    
    return NextResponse.json({
      success: true,
      envVars,
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error checking environment variables',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
      } : String(error)
    }, { status: 500 });
  }
}
