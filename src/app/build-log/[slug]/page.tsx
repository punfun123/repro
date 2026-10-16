import Link from 'next/link';
import Markdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { buildLogs } from '@/content/build-log';
export async function generateStaticParams() { return (await buildLogs()).map(log => ({ slug: log.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: (await buildLogs()).find(log => log.slug === slug)?.title || 'Build log' }; }
export default async function Log({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const log = (await buildLogs()).find(log => log.slug === slug); if (!log) notFound(); return <article className="standard-page single-log"><Link href="/build-log" className="text-link">← All development notes</Link><time>{log.date}</time><h1>{log.title}</h1><p className="log-summary">{log.summary}</p><div className="markdown-body"><Markdown>{log.body}</Markdown></div></article>; }
