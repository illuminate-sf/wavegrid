/**
 * Runtime config endpoint — allows a single UI build to serve
 * different grids by reading env vars at request time (not build time).
 */
export const dynamic = 'force-dynamic';

function parseGrid(): { numCannons: number; gridColumns: number } {
  const gridEnv = process.env.GRID;
  if (gridEnv) {
    const m = gridEnv.match(/^(\d+)x(\d+)$/i);
    if (m) {
      const cols = parseInt(m[1], 10);
      const rows = parseInt(m[2], 10);
      return { numCannons: cols * rows, gridColumns: cols };
    }
  }
  return {
    numCannons: parseInt(
      process.env.NUM_CANNONS || process.env.NEXT_PUBLIC_NUM_CANNONS || '49',
      10
    ),
    gridColumns: parseInt(
      process.env.GRID_COLUMNS || process.env.NEXT_PUBLIC_GRID_COLUMNS || '7',
      10
    )
  };
}

export function GET(request: Request) {
  const { numCannons, gridColumns } = parseGrid();

  // Check if request came through HTTPS reverse proxy
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const wsPath = process.env.WS_PATH;
  const host = request.headers.get('host');

  let simulatorUrl: string;
  if (forwardedProto === 'https' && wsPath && host) {
    // Behind Traefik with SSL — use wss:// with the same domain
    simulatorUrl = `wss://${host}${wsPath}`;
  } else {
    // Direct access — use explicit URL or default
    simulatorUrl =
      process.env.SIMULATOR_URL ||
      process.env.NEXT_PUBLIC_SIMULATOR_URL ||
      'ws://localhost:3000';
  }

  return Response.json({ simulatorUrl, numCannons, gridColumns });
}
