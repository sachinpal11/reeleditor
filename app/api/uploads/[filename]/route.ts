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
    const totalSize = stat.size;

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
    const contentType = types[ext] || 'application/octet-stream';

    // Support HTTP 206 Range requests (crucial for iOS Safari / Mobile Video Playback)
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        const chunkSize = end - start + 1;

        const fileStream = fs.createReadStream(filePath, { start, end });

        return new NextResponse(fileStream as any, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': contentType,
          },
        });
      }
    }

    // Default full file response
    const fileStream = fs.createReadStream(filePath);
    return new NextResponse(fileStream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    console.error('Upload stream error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
