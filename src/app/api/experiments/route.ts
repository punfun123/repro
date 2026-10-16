import { inputSchema } from '@/experiment/types';
import { limitedJson, ownerHash, sameOrigin } from '@/experiment/access';
import { serviceStatus } from '@/config/services';
import { acquire } from '@/experiment/limits';
import { database, saveExperiment } from '@/experiment/store';
import { runExperiment } from '@/experiment/pipeline';
import { groqAI } from '@/ai/groq';
import { executeSandbox } from '@/sandbox/execute';
export const runtime = 'nodejs';
export const maxDuration = 240;
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'ORIGIN_REJECTED' }, { status: 403 });
  const owner = await ownerHash();
  if (!owner) return Response.json({ error: 'SESSION_REQUIRED' }, { status: 401 });
  let input;
  try { input = inputSchema.parse(await limitedJson(request)); }
  catch { return Response.json({ error: 'INVALID_INPUT', message: 'Use a JavaScript snippet up to 12,000 characters and describe the expected behavior.' }, { status: 400 }); }
  const services = serviceStatus();
  if (!services.ready) return Response.json({ error: services.reason, services }, { status: 503 });
  let release;
  try { release = await acquire(owner, request); }
  catch (error) { const reason = error instanceof Error ? error.message : 'RATE_LIMIT_UNAVAILABLE'; return Response.json({ error: reason }, { status: reason === 'RATE_LIMITED' ? 429 : 503, headers: { 'Retry-After': '60' } }); }
  const encoder = new TextEncoder(); let disconnected = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => { if (!disconnected) { try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { disconnected = true; } } };
      const heartbeat = setInterval(() => { if (!disconnected) { try { controller.enqueue(encoder.encode(': connection alive\n\n')); } catch { disconnected = true; } } }, 10000);
      try {
        const record = await runExperiment(input, { ai: groqAI, run: executeSandbox, persistence: database() ? 'supabase' : 'ephemeral', onEvent: record => send('progress', record) });
        try { await saveExperiment(owner, record); send('result', record); }
        catch { send('error', { error: 'PERSISTENCE_UNAVAILABLE', message: 'Execution finished but the record could not be saved. Download the evidence now.', record }); }
      } catch { send('error', { error: 'EXECUTION_ERROR' }); }
      finally { clearInterval(heartbeat); await release(); if (!disconnected) controller.close(); }
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', 'X-Accel-Buffering': 'no' } });
}
