import Link from 'next/link';
import Markdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { buildLogs } from '@/content/build-log';
import { readSandboxFixture } from '@/content/sandbox-fixture';
import { SandboxFixtureVisualizer } from '@/components/sandbox-fixture-visualizer';
import { project } from '@/config/project';
export async function generateStaticParams() { return (await buildLogs()).map(log => ({ slug: log.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const log = (await buildLogs()).find(log => log.slug === slug); return { title: log?.title || 'Build log', description: log?.summary }; }
export default async function Log({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [logs, fixture] = await Promise.all([buildLogs(), slug === '2026-10-16-002-isolated-harness' ? readSandboxFixture() : Promise.resolve(null)]);
  const log = logs.find(log => log.slug === slug); if (!log) notFound();
  return <article className="standard-page single-log">
    <Link href="/build-log" className="text-link">← All development notes</Link><time>{log.date}</time><h1>{log.title}</h1><p className="log-summary">{log.summary}</p>
    {fixture ? <SandboxFixtureVisualizer fixture={fixture} repository={project.repository}/> : null}
    <div className="markdown-body"><Markdown>{log.body}</Markdown></div>
  </article>;
}
