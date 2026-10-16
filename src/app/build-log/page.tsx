import Link from 'next/link';
import { buildLogs } from '@/content/build-log';
import { project } from '@/config/project';

export const metadata = {
  title: 'Build log',
  description: 'What I built for REPRO, what I tested, and what the evidence still cannot prove.',
};

type Log = Awaited<ReturnType<typeof buildLogs>>[number];

const implementationSlugs = ['2026-10-17-007-deterministic-observatory', '2026-10-16-001-first-pipeline', '2026-10-16-006-evidence-views'];
const verifiedRunSlugs = ['2026-10-16-002-isolated-harness'];

function LogSection({ label, title, description, logs, kind }: {
  label: string;
  title: string;
  description: string;
  logs: Log[];
  kind: string;
}) {
  if (!logs.length) return null;

  return <section className="log-section">
    <header className="log-section-heading">
      <span>{label}</span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </header>
    <div className="log-list">
      {logs.map(log => <Link key={log.slug} href={`/build-log/${log.slug}`} className="log-row">
        <div className="log-date"><span>{log.date}</span><span>{kind}</span></div>
        <div><h3>{log.title}</h3><p>{log.summary}</p><span className="log-read">Read my note ↗</span></div>
      </Link>)}
    </div>
  </section>;
}

export default async function BuildLog() {
  const logs = await buildLogs();
  const bySlugs = (slugs: string[]) => slugs.map(slug => logs.find(log => log.slug === slug)).filter((log): log is Log => Boolean(log));
  const implementationLogs = bySlugs(implementationSlugs);
  const verifiedRunLogs = bySlugs(verifiedRunSlugs);
  const recordedSlugs = new Set([...implementationSlugs, ...verifiedRunSlugs]);
  const siteLogs = logs.filter(log => !recordedSlugs.has(log.slug));

  return <div className="standard-page build-log-page">
    <div className="page-heading build-log-heading">
      <span className="path-label">build-log / experiments</span>
      <h1>I test before I say “fixed”<span>.</span></h1>
      <p>I record what I built, what I actually ran and what those results still leave unanswered.</p>
    </div>

    <div className="log-principle">
      <p>I define expected behavior first, then compare an original failure and a candidate against the same assertions.</p>
      <p>The current Observatory runs explicitly simulated models. My earlier provider pipeline and completed controlled Sandbox run remain here as separate engineering records.</p>
    </div>

    <LogSection
      label="01 / IMPLEMENTATION"
      title="What I built"
      description="How I separate expected behavior, the original failure, a candidate patch and the test verdict."
      logs={implementationLogs}
      kind="IMPLEMENTATION NOTE"
    />
    <LogSection
      label="02 / CONTROLLED RUN"
      title="What I have actually tested"
      description="A controlled fixture run checked the sandbox harness; no Groq request was made."
      logs={verifiedRunLogs}
      kind="HARNESS EVIDENCE"
    />
    <LogSection
      label="03 / SITE NOTES"
      title="How I make the work easier to inspect"
      description="I record how the site presents the story, source code and project evidence."
      logs={siteLogs}
      kind="INTERFACE NOTE"
    />

    {project.repository ? <a className="text-link" href={`${project.repository}/commits/main`} target="_blank" rel="noreferrer">Inspect the actual commit history ↗</a> : null}
  </div>;
}
