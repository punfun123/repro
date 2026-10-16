import { getVercelOidcTokenSync } from '@vercel/oidc';
export function serviceStatus() {
  const ai = !!process.env.GROQ_API_KEY;
  let oidc = false;
  // Functions receive OIDC in request context; process.env alone misses it.
  try { oidc = !!getVercelOidcTokenSync(); } catch { /* Missing local / runtime credential. */ }
  const execution = oidc || !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID && process.env.VERCEL_TEAM_ID);
  const database = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  const enabled = process.env.REPRO_EXECUTION_ENABLED === 'true';
  const productionReady = process.env.NODE_ENV !== 'production' || (database && !!process.env.REPRO_RATE_SALT);
  return { ai, execution, database, enabled, ready: ai && execution && enabled && productionReady,
    reason: !ai ? 'AI UNAVAILABLE' : !execution ? 'EXECUTION UNAVAILABLE' : !enabled ? 'EXECUTION DISABLED' : !productionReady ? 'PERSISTENCE / RATE LIMIT UNAVAILABLE' : 'READY' };
}
