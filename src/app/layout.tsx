import type { Metadata } from 'next';
import { ResearchShell as Shell } from '@/components/research/shell';
import './globals.css';
import './visualizations.css';
import './research.css';
import './computational.css';
export const metadata: Metadata = { title: { default: 'REPRO — The Bug Observatory', template: '%s · REPRO' }, description: 'A visual investigation into software failure, reproduction and verification. Local rule execution, inspectable state and verifiable engineering records.', icons: { icon: '/repro-token-logo.png', apple: '/repro-token-logo.png' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><body><Shell>{children}</Shell></body></html>; }
