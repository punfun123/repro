// Explicit public source whitelist. Never accept a filesystem path from a request.
export const sourceFiles = [
  { id: 'pipeline', path: 'src/experiment/pipeline.ts', description: 'The experiment state machine. Tests are fixed before patch generation.' },
  { id: 'groq', path: 'src/ai/groq.ts', description: 'Server-only Groq calls, model-aware structured output and response validation.' },
  { id: 'sandbox', path: 'src/sandbox/execute.ts', description: 'A fresh network-denied microVM for each original and candidate run.' },
  { id: 'harness', path: 'scripts/runner.cjs', description: 'The trusted assertion harness. User code never receives the expected values.' },
  { id: 'verdict', path: 'src/verification/verdict.ts', description: 'Evidence determines the verdict; AI cannot declare a test passed.' },
  { id: 'access', path: 'src/experiment/access.ts', description: 'Random HttpOnly session capabilities, hashed owners and bounded request parsing.' },
  { id: 'limits', path: 'src/experiment/limits.ts', description: 'Distributed database leases and rate limits; production fails closed.' },
  { id: 'store', path: 'src/experiment/store.ts', description: 'Private Supabase records and explicitly ephemeral development storage.' },
  { id: 'schema', path: 'supabase/bootstrap.sql', description: 'RLS-enabled tables, revoked client grants, atomic run leases.' },
  { id: 'project', path: 'src/config/project.ts', description: 'One place to configure the token launch, official X and repository.' },
  { id: 'tests', path: 'tests/pipeline.test.ts', description: 'Executable orchestration, privacy and safety checks. Explicit test doubles are not live AI experiments.' },
] as const;
