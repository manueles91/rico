import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/db';
import { stackServerApp } from '@/stack';

export const dynamic = 'force-dynamic';

/**
 * API route to initialize the database
 * This should be called during app deployment or first run
 */
export async function GET() {
  try {
    // Authenticate user in production environments
    if (process.env.NODE_ENV === 'production') {
      const stackUser = await stackServerApp.getUser();
      if (!stackUser) {
        return NextResponse.json({ 
          success: false, 
          message: 'Authentication required to initialize database in production' 
        }, { status: 401 });
      }
    }
    
    const result = await initializeDatabase();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database initialized successfully',
        details: result
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to initialize database',
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error initializing database',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
