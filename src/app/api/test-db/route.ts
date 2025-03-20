import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Test the database connection by running a simple query
    const result = await query('SELECT NOW() as time');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      time: result[0].time,
      connectionDetails: {
        // Don't include sensitive information, just connection status
        connected: true,
        database: process.env.NEON_DATABASE_URL ? 'Database URL is set' : 'Database URL is missing',
        authenticatedDatabase: process.env.NEON_DATABASE_AUTHENTICATED_URL ? 'Authenticated Database URL is set' : 'Authenticated Database URL is missing'
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 });
  }
}
