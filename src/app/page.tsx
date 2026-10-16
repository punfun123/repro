import { ResearchWorkspace } from '@/components/research/workspace';
export const metadata = { title: 'The Bug Observatory', description: 'A deterministic research environment for software failure, reproduction and verification. Explicitly simulated scenarios, inspectable source and preserved execution evidence.' };
export default async function Home({ searchParams }: { searchParams: Promise<{ case?: string; candidate?: string }> }) {
  const params = await searchParams;
  return <ResearchWorkspace key={(params.case || '') + (params.candidate || '')} initialCase={params.case} initialCandidate={params.candidate}/>;
}
