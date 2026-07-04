import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { RenderTask, WordStyle } from '../../../types';

// ─── History ─────────────────────────────────────────────────────────────────
async function addToHistory(task: RenderTask) {
  const historyFile = path.join(process.cwd(), 'renders', 'history.json');
  let history: RenderTask[] = [];

  const rendersDir = path.dirname(historyFile);
  if (!fs.existsSync(rendersDir)) {
    await fs.promises.mkdir(rendersDir, { recursive: true });
  }

  if (fs.existsSync(historyFile)) {
    try {
      const data = await fs.promises.readFile(historyFile, 'utf8');
      history = JSON.parse(data);
    } catch (e) {
      history = [];
    }
  }

  history = [task, ...history.filter((t) => t.id !== task.id)];
  await fs.promises.writeFile(historyFile, JSON.stringify(history, null, 2), 'utf8');
}

// ─── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, videoPath, words, config, duration: inputDuration } = body;

    if (!id || !videoPath || !words || !config) {
      return NextResponse.json({ error: 'Missing required parameters for rendering.' }, { status: 400 });
    }

    let resolvedVideoPath = videoPath;
    let duration = inputDuration || 15;

    if (videoPath.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'public', videoPath);
      if (fs.existsSync(fullPath)) {
        resolvedVideoPath = 'file:///' + fullPath.replace(/\\/g, '/');
      }
    }

    const workerInput = JSON.stringify({
      id,
      videoPath,
      resolvedVideoPath,
      words,
      config,
      duration,
    });

    const workerPath = path.join(process.cwd(), 'render-worker.js');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Spawn the render worker as a completely separate Node.js process.
          // This is the ONLY way to avoid Next.js's module sandbox interfering
          // with Puppeteer's Chrome DevTools Protocol WebSocket connection.
          const worker = spawn(process.execPath, [workerPath], {
            cwd: process.cwd(),
            env: { ...process.env },
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          // Send input config to the worker via stdin
          worker.stdin.write(workerInput);
          worker.stdin.end();

          let stderrOutput = '';
          worker.stderr.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            stderrOutput += text;
            console.error('[render-worker stderr]', text.trim());
          });

          // Extract only real error lines from stderr (skip [render-worker] debug lines)
          function getActualError(stderr: string): string {
            const lines = stderr.split('\n').map(l => l.trim()).filter(Boolean);
            const errorLines = lines.filter(l => !l.startsWith('[render-worker]'));
            return (errorLines.length > 0 ? errorLines : lines).join(' ').slice(0, 800);
          }

          // Stream progress lines from stdout
          let buffer = '';
          worker.stdout.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim(); // strip \r from Windows \r\n line endings
              if (!trimmed) continue;
              try {
                const msg = JSON.parse(trimmed); // MUST use trimmed, not raw line

                if (msg.type === 'progress') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ status: 'rendering', progress: msg.progress })}\n\n`)
                  );
                } else if (msg.type === 'done') {
                  // Success — save to history and signal completion
                  const finalDownloadUrl = `/api/renders/${id}.mp4`;
                  const completedTask: RenderTask = {
                    id,
                    words,
                    videoName: path.basename(videoPath),
                    videoUrl: videoPath,
                    duration: msg.duration || duration,
                    status: 'completed',
                    progress: 100,
                    date: new Date().toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    downloadUrl: finalDownloadUrl,
                  };
                  addToHistory(completedTask).catch(console.error);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ status: 'completed', url: finalDownloadUrl })}\n\n`)
                  );
                  controller.close();
                } else if (msg.type === 'error') {
                  throw new Error(msg.message);
                }
              } catch (parseErr: any) {
                // If JSON parse fails the line is a non-JSON log — ignore
                if (line.startsWith('{')) {
                  console.warn('[render-worker] Unparseable line:', line);
                }
              }
            }
          });

          // Handle worker exit
          worker.on('close', (code: number) => {
            if (code !== 0) {
              const errMsg = getActualError(stderrOutput) || `Worker exited with code ${code}`;
              console.error('[render-worker] exited non-zero:', errMsg);

              const failedTask: RenderTask = {
                id,
                words,
                videoName: path.basename(videoPath),
                videoUrl: videoPath,
                duration,
                status: 'failed',
                progress: 0,
                date: new Date().toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                error: errMsg.slice(0, 500),
              };
              addToHistory(failedTask).catch(console.error);

              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ status: 'failed', error: errMsg.slice(0, 500) })}\n\n`)
                );
                controller.close();
              } catch { /* already closed */ }
            }
          });

          worker.on('error', (err: Error) => {
            console.error('[render-worker] spawn error:', err);
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ status: 'failed', error: err.message })}\n\n`)
              );
              controller.close();
            } catch { /* already closed */ }
          });

        } catch (err: any) {
          console.error('Stream start error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: 'failed', error: err.message || 'Render failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Outer Render API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to start rendering process' }, { status: 500 });
  }
}
