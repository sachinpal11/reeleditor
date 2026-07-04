/**
 * render-worker.js
 * Standalone Node.js script that runs Remotion outside Next.js's module sandbox.
 * Called as a child process by the render API route.
 * Reads config from stdin JSON, streams progress to stdout as JSON lines.
 *
 * The HTTP server serves BOTH the Remotion webpack bundle AND the project's
 * public/ directory (videos, images, assets). This bypasses Chrome's security
 * restriction on loading file:// local resources in headless mode.
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.mp4':  'video/mp4',
  '.mov':  'video/quicktime',
  '.webm': 'video/webm',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
  '.ico':  'image/x-icon',
};

async function main() {
  // Read input from stdin
  let inputData = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  const { id, videoPath, resolvedVideoPath, words, config, duration: inputDuration, uploadsDir, rendersDir } = JSON.parse(inputData);

  function send(obj) {
    process.stdout.write(JSON.stringify(obj) + '\n');
  }

  try {
    const { bundle } = require('@remotion/bundler');
    const { renderMedia, selectComposition } = require('@remotion/renderer');

    send({ type: 'progress', progress: 0.01 });

    // Bundle the Remotion project
    const entryPoint = path.join(process.cwd(), 'remotion', 'index.ts');
    const bundlePath = await bundle({ entryPoint });
    send({ type: 'progress', progress: 0.03 });

    // Public directory (Next.js serves this at /)
    const publicDir = path.join(process.cwd(), 'public');

    // Single HTTP server that serves:
    //   /                 → Remotion webpack bundle (for Remotion's renderer)
    //   /public/uploads/* → writeable uploads directory (temp or local)
    //   /public/*         → static assets from project public/ folder
    //
    // Supports HTTP 206 Range requests — required for Chrome's <video> element.
    const port = await new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

        let filePath;
        if (urlPath.startsWith('/public/uploads/')) {
          filePath = path.join(uploadsDir, urlPath.slice('/public/uploads'.length));
        } else if (urlPath.startsWith('/public/')) {
          filePath = path.join(publicDir, urlPath.slice('/public'.length));
        } else {
          if (urlPath === '/') urlPath = '/index.html';
          filePath = path.join(bundlePath, urlPath);
        }

        // Security: prevent path traversal
        const bundleResolved = path.resolve(bundlePath);
        const publicResolved = path.resolve(publicDir);
        const uploadsResolved = path.resolve(uploadsDir);
        const fileResolved   = path.resolve(filePath);
        if (
          !fileResolved.startsWith(bundleResolved) &&
          !fileResolved.startsWith(publicResolved) &&
          !fileResolved.startsWith(uploadsResolved)
        ) {
          res.writeHead(403); res.end('Forbidden'); return;
        }

        fs.stat(filePath, (statErr, stat) => {
          if (statErr || !stat.isFile()) {
            res.writeHead(404); res.end('Not found'); return;
          }

          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const totalSize = stat.size;
          const rangeHeader = req.headers['range'];

          if (rangeHeader) {
            // Parse "bytes=start-end"
            const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
            const start = match[1] ? parseInt(match[1], 10) : 0;
            const end   = match[2] ? parseInt(match[2], 10) : totalSize - 1;
            const chunkSize = end - start + 1;

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize,
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
          } else {
            res.writeHead(200, {
              'Content-Length': totalSize,
              'Content-Type': contentType,
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(filePath).pipe(res);
          }
        });
      });
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
      server.on('error', reject);
    });

    const serveUrl = `http://127.0.0.1:${port}`;

    // Convert file:// video path → http:// served through our local server.
    // Chrome's headless mode blocks file:// resources; http:// works fine.
    let httpVideoPath = resolvedVideoPath;
    if (resolvedVideoPath.startsWith('file:///')) {
      // Extract the absolute file path from the file:// URL
      const absPath = decodeURIComponent(resolvedVideoPath.replace(/^file:\/\/\//, '').replace(/\//g, path.sep));
      const uploadsResolved = path.resolve(uploadsDir);
      const fileResolved = path.resolve(absPath);

      if (fileResolved.startsWith(uploadsResolved)) {
        const rel = fileResolved.slice(uploadsResolved.length).replace(/\\/g, '/');
        httpVideoPath = `${serveUrl}/public/uploads${rel}`;
      } else {
        const publicResolved = path.resolve(publicDir);
        if (fileResolved.startsWith(publicResolved)) {
          const rel = fileResolved.slice(publicResolved.length).replace(/\\/g, '/');
          httpVideoPath = `${serveUrl}/public${rel}`;
        }
      }
    } else if (resolvedVideoPath.startsWith('/uploads/') || resolvedVideoPath.startsWith('/api/uploads/')) {
      const filename = path.basename(resolvedVideoPath);
      httpVideoPath = `${serveUrl}/public/uploads/${filename}`;
    }

    console.error(`[render-worker] bundle at ${serveUrl}`);
    console.error(`[render-worker] video at  ${httpVideoPath}`);
    send({ type: 'progress', progress: 0.05 });

    // Resolve Chrome path
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.PUPPETEER_EXECUTABLE_PATH,
    ].filter(Boolean);

    let resolvedChrome;
    for (const p of chromePaths) {
      try { if (fs.existsSync(p)) { resolvedChrome = p; break; } } catch {}
    }

    if (!resolvedChrome) {
      console.error('[render-worker] No local Chrome/Edge found. Falling back to Remotion browser auto-download.');
    }

    // Select composition options
    const selectOptions = {
      serveUrl,
      id: 'SocialMediaReel',
      inputProps: { videoPath: httpVideoPath, words, config },
      chromeMode: 'chrome-for-testing',
    };
    if (resolvedChrome) {
      selectOptions.browserExecutable = resolvedChrome;
    }

    const composition = await selectComposition(selectOptions);

    // Override duration if provided
    let duration = inputDuration || 15;
    if (duration) {
      composition.durationInFrames = Math.max(30, Math.round(duration * 30));
    }

    const outputLocation = path.join(rendersDir, `${id}.mp4`);
    fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

    // Render media options
    const renderOptions = {
      composition,
      serveUrl,
      codec: 'h264',
      pixelFormat: 'yuv420p', // Force standard mobile-compatible pixel format
      x264Preset: 'ultrafast',
      outputLocation,
      inputProps: { videoPath: httpVideoPath, words, config },
      chromeMode: 'chrome-for-testing',
      concurrency: 3,
      onProgress: ({ progress }) => {
        send({ type: 'progress', progress: 0.05 + progress * 0.94 });
      },
    };
    if (resolvedChrome) {
      renderOptions.browserExecutable = resolvedChrome;
    }

    await renderMedia(renderOptions);

    send({ type: 'done', outputLocation, duration });
  } catch (err) {
    send({ type: 'error', message: err.message || String(err) });
    process.exit(1);
  }
}

main();
