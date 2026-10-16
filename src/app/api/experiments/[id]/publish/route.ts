import { limitedJson, ownerHash, sameOrigin } from '@/experiment/access';
import { database, readExperiment } from '@/experiment/store';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'ORIGIN_REJECTED' }, { status: 403 });
  const owner = await ownerHash(); const db = database();
  if (!owner || !db) return Response.json({ error: 'PUBLISH_UNAVAILABLE' }, { status: 503 });
  const { id } = await params;
  const record = await readExperiment(owner, id);
  if (!record) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  let body;
  try { body = await limitedJson(request, 1000) as { confirm?: boolean }; } catch { return Response.json({ error: 'INVALID_INPUT' }, { status: 400 }); }
  if (body.confirm !== true) return Response.json({ error: 'EXPLICIT_CONFIRMATION_REQUIRED' }, { status: 400 });
  // Publish only a minimal status receipt. Code, error text, AI output and logs stay private.
  const receipt = { id, created_at: record.createdAt, status: record.status, test_count: record.plan?.tests.length || 0 };
  const { error } = await db.from('public_receipts').upsert(receipt);
  return error ? Response.json({ error: 'PUBLISH_FAILED' }, { status: 503 }) : Response.json({ url: `/lab/receipt/${id}`, receipt });
}
