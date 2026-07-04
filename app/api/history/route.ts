import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { RenderTask } from '../../../types';
import { getRendersDir } from '../../../lib/paths';

const getHistoryFilePath = () => path.join(getRendersDir(), 'history.json');

export async function GET() {
  try {
    const historyFile = getHistoryFilePath();
    if (!fs.existsSync(historyFile)) {
      return NextResponse.json([]);
    }
    const data = await fs.promises.readFile(historyFile, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Render ID is required' }, { status: 400 });
    }

    const historyFile = getHistoryFilePath();
    if (!fs.existsSync(historyFile)) {
      return NextResponse.json({ error: 'History database not found' }, { status: 404 });
    }

    const fileData = await fs.promises.readFile(historyFile, 'utf8');
    const tasks: RenderTask[] = JSON.parse(fileData);

    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Render task not found' }, { status: 404 });
    }

    const taskToDelete = tasks[taskIndex];

    // Remove the task from the list
    const updatedTasks = tasks.filter((t) => t.id !== id);
    await fs.promises.writeFile(historyFile, JSON.stringify(updatedTasks, null, 2), 'utf8');

    // Delete the actual video file if it exists
    if (taskToDelete.downloadUrl) {
      const filename = path.basename(taskToDelete.downloadUrl);
      const filePath = path.join(getRendersDir(), filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('History DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete history item' }, { status: 500 });
  }
}
