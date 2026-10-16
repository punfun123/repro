import { database } from '@/experiment/store';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const db = database(); if (!db) notFound();
  const { data } = await db.from('public_receipts').select('id,created_at,status,test_count').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div className="standard-page"><div className="page-heading"><h1>Public status receipt<span>.</span></h1><p>The owner explicitly published these four fields. Submission code and logs remain private.</p></div><pre>{JSON.stringify(data, null, 2)}</pre><p>A status receipt alone is not independently sufficient execution evidence.</p></div>;
}
