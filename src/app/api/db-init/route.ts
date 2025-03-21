import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * API route to initialize the database
 * This should be called during app deployment or first run
 */
export async function GET() {
  try {
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
      error
    }, { status: 500 });
  }
}
