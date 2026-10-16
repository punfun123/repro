import { ResearchWorkspace } from '@/components/research/workspace';
export const metadata = { title: 'Simulated experiments' };
export default async function Experiments({ searchParams }: { searchParams: Promise<{ case?: string; candidate?: string }> }) {
  const params = await searchParams;
  return <ResearchWorkspace key={(params.case || '') + (params.candidate || '')} view="experiments" initialCase={params.case} initialCandidate={params.candidate}/>;
}
