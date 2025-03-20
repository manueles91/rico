import { NextResponse } from 'next/server';

export async function GET() {
  // Create a safe version of the environment variables
  const safeEnv = {
    // Database
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? 'Set' : 'Not set',
    
    // Stack Auth
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID ? 'Set' : 'Not set',
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ? 'Set' : 'Not set',
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY ? 'Set' : 'Not set',
    
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
    
    // OpenAI
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Set' : 'Not set',
    
    // Venice
    VENICE_API_KEY: process.env.VENICE_API_KEY ? 'Set' : 'Not set',
    
    // Node environment
    NODE_ENV: process.env.NODE_ENV || 'Not set',
  };
  
  return NextResponse.json({
    success: true,
    environment: safeEnv,
    nodeVersion: process.version,
  });
}
