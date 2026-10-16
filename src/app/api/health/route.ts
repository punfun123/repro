import { serviceStatus } from '@/config/services';
export const dynamic = 'force-dynamic';
export function GET() { return Response.json(serviceStatus(), { headers: { 'Cache-Control': 'no-store' } }); }
