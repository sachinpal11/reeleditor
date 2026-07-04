import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRendersDir } from '../../../lib/paths';

// Writeable path in os.tmpdir (or renders/ locally)
const getFilePath = () => path.join(getRendersDir(), 'templates.json');

// Packaged read-only default path
const getDefaultFilePath = () => path.join(process.cwd(), 'config', 'templates.json');

export async function GET() {
  try {
    let filePath = getFilePath();
    
    // If the writeable user-edited config doesn't exist yet, fall back to default packaged config
    if (!fs.existsSync(filePath)) {
      filePath = getDefaultFilePath();
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Templates config file not found' }, { status: 404 });
    }
    const data = await fs.promises.readFile(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate that required top-level keys exist
    if (!body.activeTemplateId || !body.templates) {
      return NextResponse.json({ error: 'Invalid configuration format' }, { status: 400 });
    }

    const filePath = getFilePath();
    
    // Ensure parent dir exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, JSON.stringify(body, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save templates' }, { status: 500 });
  }
}
