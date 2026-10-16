import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export async function ownerHash() {
  const token = (await cookies()).get('repro_session')?.value;
  return token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : null;
}
export async function sessionResponse() {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  if (!await ownerHash()) response.cookies.set('repro_session', randomBytes(32).toString('hex'), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 86400 * 7 });
  return response;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const host = request.headers.get('host') || new URL(request.url).host;
    // Next's internal request URL may use localhost behind its listener/proxy.
    return source.host === host && source.origin === origin && (source.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && source.protocol === 'http:'));
  } catch { return false; }
}
export async function limitedJson(request: Request, max = 32000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('EMPTY_BODY');
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > max) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
