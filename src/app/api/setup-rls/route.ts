import { NextResponse } from 'next/server';
import { RLSService } from '@/features/rls/rls.service';

export const dynamic = 'force-dynamic';

/**
 * API route for setting up Row Level Security policies
 * This endpoint configures RLS for all database tables
 */

// Main API route handler
export async function GET() {
  try {
    const result = await RLSService.setupRLS();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Row Level Security policies applied successfully',
        results: result.results
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to apply some Row Level Security policies',
        results: result.results
      }, { status: 500 });
    }
  } catch (error) {
    console.error('RLS Setup Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup RLS',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
