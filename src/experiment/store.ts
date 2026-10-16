import { createClient } from '@supabase/supabase-js';
import type { Experiment } from './types';
const memory = new Map<string, { owner: string; record: Experiment; expires: number }>();
export function database() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function saveExperiment(owner: string, record: Experiment) {
  const db = database();
  if (db) {
    const { error } = await db.from('experiments').upsert({ id: record.id, owner_hash: owner, created_at: record.createdAt, status: record.status, record, is_public: false });
    if (error) throw new Error('PERSISTENCE_UNAVAILABLE');
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('PERSISTENCE_UNAVAILABLE');
    for (const [id, item] of memory) if (item.expires < Date.now()) memory.delete(id);
    if (memory.size > 100) memory.delete(memory.keys().next().value!);
    memory.set(record.id, { owner, record: structuredClone(record), expires: Date.now() + 3600000 });
  }
}
export async function readExperiment(owner: string, id: string): Promise<Experiment | null> {
  const db = database();
  if (db) {
    const { data, error } = await db.from('experiments').select('record').eq('id', id).eq('owner_hash', owner).maybeSingle();
    if (error) throw new Error('PERSISTENCE_UNAVAILABLE');
    return data?.record ?? null;
  }
  const item = memory.get(id);
  return item && item.owner === owner && item.expires > Date.now() ? structuredClone(item.record) : null;
}
