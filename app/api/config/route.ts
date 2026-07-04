import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const getFilePath = () => path.join(process.cwd(), 'config', 'templates.json');

export async function GET() {
  try {
    const filePath = getFilePath();
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
    await fs.promises.writeFile(filePath, JSON.stringify(body, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save templates' }, { status: 500 });
  }
}
