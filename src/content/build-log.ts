import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
export async function buildLogs() {
  const root = path.join(process.cwd(), 'content/build-log');
  const files = (await readdir(root)).filter(file => /^[a-z0-9-]+\.md$/.test(file));
  return Promise.all(files.sort().reverse().map(async file => {
    const raw = await readFile(path.join(root, file), 'utf8');
    const [title, date, summary, ...body] = raw.split('\n');
    return { slug: file.slice(0, -3), title: title.replace(/^# /, '').trim(), date: date.trim(), summary: summary.trim(), body: body.join('\n') };
  }));
}
