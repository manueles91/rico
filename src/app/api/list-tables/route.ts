import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Query to list all tables in the database
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Query to get table schemas
    const schemas = await Promise.all(
      tables.map(async (table: { table_name: string }) => {
        const columns = await query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
        `, [table.table_name]);
        
        return {
          table_name: table.table_name,
          columns
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      tables: tables.map((t: { table_name: string }) => t.table_name),
      schemas
    });
  } catch (error) {
    console.error('Error listing tables:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list tables',
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}
