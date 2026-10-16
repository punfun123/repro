import type { Metadata } from 'next';
import { Lab } from '@/components/lab';
import { serviceStatus } from '@/config/services';
export const metadata: Metadata = { title: 'Experiment' };
export const dynamic = 'force-dynamic';
export default function LabPage() { return <Lab services={serviceStatus()}/>; }
