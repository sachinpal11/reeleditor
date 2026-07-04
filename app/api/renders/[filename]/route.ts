import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Safety check to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'renders', sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const stat = await fs.promises.stat(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Stream the file back
    return new NextResponse(fileStream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    console.error('File stream error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
