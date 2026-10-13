import { authorize, dashboardSync, parseRequest, serialized } from '@/lib/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try { authorize(request); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 403 }); }
  try {
    const options = await parseRequest(request);
    return Response.json(await serialized(() => dashboardSync(options)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
}
