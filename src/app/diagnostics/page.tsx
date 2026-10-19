import { ResearchWorkspace } from '@/components/research/workspace';
export const metadata = { title: 'Failure diagnostics' };
export default async function Diagnostics({ searchParams }: { searchParams: Promise<{ case?: string; candidate?: string; condition?:string }> }) {
  const params = await searchParams;
  return <ResearchWorkspace key={[params.case,params.candidate,params.condition].join('/')} view="diagnostics" initialCase={params.case} initialCandidate={params.candidate} initialCondition={params.condition}/>;
}
