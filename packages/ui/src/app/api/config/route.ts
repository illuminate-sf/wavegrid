/**
 * Runtime config endpoint — allows a single UI build to serve
 * different grids by reading env vars at request time (not build time).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    simulatorUrl:
      process.env.SIMULATOR_URL ||
      process.env.NEXT_PUBLIC_SIMULATOR_URL ||
      'ws://localhost:3000',
    numCannons: parseInt(
      process.env.NUM_CANNONS || process.env.NEXT_PUBLIC_NUM_CANNONS || '49',
      10
    ),
    gridColumns: parseInt(
      process.env.GRID_COLUMNS || process.env.NEXT_PUBLIC_GRID_COLUMNS || '7',
      10
    )
  });
}
