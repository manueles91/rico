import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    // Test if we can access Vercel Blob Storage
    const { blobs } = await list();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Vercel Blob Storage is working correctly',
      blobs: blobs.map(blob => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Error testing Vercel Blob Storage:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error testing Vercel Blob Storage',
      error: (error as Error).message
    }, { status: 500 });
  }
}
