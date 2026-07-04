import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      return NextResponse.json([]);
    }

    const files = await fs.promises.readdir(assetsDir);
    
    // Filter for common image extensions
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return allowedExtensions.includes(ext);
    });

    // Return the list of filenames.
    // The client can prepend "/assets/" to get the servable URL
    return NextResponse.json(imageFiles);
  } catch (err: any) {
    console.error('Assets API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list assets' }, { status: 500 });
  }
}
