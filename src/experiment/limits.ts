import { randomUUID } from 'node:crypto';
import { database } from './store';
import { digest } from './access';
const events = new Map<string, number[]>();
let active = 0;
export async function acquire(owner: string, request: Request): Promise<() => Promise<void>> {
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ipHash = digest((process.env.REPRO_RATE_SALT || 'local-development') + ip);
  const db = database();
  if (db) {
    const { data, error } = await db.rpc('claim_repro_run', { p_owner: owner, p_ip: ipHash });
    if (error || !data) throw new Error(error?.message.includes('RATE_LIMITED') ? 'RATE_LIMITED' : 'RATE_LIMIT_UNAVAILABLE');
    return async () => { const { error } = await db.from('run_leases').delete().eq('id', data); if (error) console.error('REPRO lease cleanup failed; TTL will release it.'); };
  }
  if (process.env.NODE_ENV === 'production') throw new Error('RATE_LIMIT_UNAVAILABLE');
  const now = Date.now();
  for (const [key, timestamps] of events) { const valid = timestamps.filter(t => t > now - 3600000); if (valid.length) events.set(key, valid); else events.delete(key); }
  const previous = events.get(owner) || [];
  if (active >= 2 || previous.length >= 3 || previous.some(t => t > now - 20000)) throw new Error('RATE_LIMITED');
  events.set(owner, [...previous, now]); active++;
  const lease = randomUUID(); let released = false;
  return async () => { if (!released && lease) { active--; released = true; } };
}
