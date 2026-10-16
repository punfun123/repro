import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
import './visualizations.css';
export const metadata: Metadata = { title: { default: 'REPRO — Make it break first.', template: '%s · REPRO' }, description: 'An AI that attempts to reproduce software bugs, proposes fixes, and verifies targeted tests. Read the story. Inspect the source. Run the experiment.', icons: { icon: '/repro-bug.png' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" data-scroll-behavior="smooth"><body><Shell>{children}</Shell></body></html>; }
