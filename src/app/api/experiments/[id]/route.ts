import { ownerHash } from '@/experiment/access';
import { readExperiment } from '@/experiment/store';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await ownerHash();
  if (!owner) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  try { const record = await readExperiment(owner, id); return record ? Response.json(record, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: 'NOT_FOUND' }, { status: 404 }); }
  catch { return Response.json({ error: 'PERSISTENCE_UNAVAILABLE' }, { status: 503 }); }
}
