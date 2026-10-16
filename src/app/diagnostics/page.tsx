import { ResearchWorkspace } from '@/components/research/workspace';
export const metadata = { title: 'Failure diagnostics' };
export default async function Diagnostics({ searchParams }: { searchParams: Promise<{ case?: string; candidate?: string }> }) {
  const params = await searchParams;
  return <ResearchWorkspace key={(params.case || '') + (params.candidate || '')} view="diagnostics" initialCase={params.case} initialCandidate={params.candidate}/>;
}
