import path from 'path';
import os from 'os';
import fs from 'fs';

export const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_BUILDER ||
  process.env.NETLIFY
);

export function getUploadsDir() {
  const dir = isServerless
    ? path.join(os.tmpdir(), 'reeleditor-uploads')
    : path.join(process.cwd(), 'public', 'uploads');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getRendersDir() {
  const dir = isServerless
    ? path.join(os.tmpdir(), 'reeleditor-renders')
    : path.join(process.cwd(), 'renders');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
