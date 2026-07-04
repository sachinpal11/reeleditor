import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadsDir } from '../../../../lib/paths';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Safety check to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(getUploadsDir(), sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const stat = await fs.promises.stat(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Basic content-type detection
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };

    return new NextResponse(fileStream as any, {
      headers: {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    console.error('Upload stream error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
