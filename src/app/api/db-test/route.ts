import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neon';

export async function GET(request: NextRequest) {
  try {
    // Simple query to test the database connection
    const result = await query<{ now: Date }>('SELECT NOW()');
    const now = result[0]?.now.toLocaleString();
    
    return NextResponse.json({ now });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
