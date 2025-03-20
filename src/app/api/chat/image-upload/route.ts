import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Check file size (max 20MB as per OpenAI requirements)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 20MB' },
        { status: 400 }
      );
    }

    // Create a unique filename
    const uniqueId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uniqueId}.${fileExtension}`;
    
    // Create the uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    try {
      // Convert the file to a Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Save the file to the uploads directory
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      
      // Create a base64 representation of the image
      const base64Image = buffer.toString('base64');
      const mimeType = file.type;
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      // Return both the URL path and the base64 data
      const fileUrl = `/uploads/${fileName}`;
      
      return NextResponse.json({ 
        url: fileUrl,
        base64Data: dataUrl
      });
    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json(
        { error: 'Error saving file', message: (error as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Failed to process upload', message: (error as Error).message },
      { status: 500 }
    );
  }
}
