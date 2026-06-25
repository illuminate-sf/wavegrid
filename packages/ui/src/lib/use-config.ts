'use client';

import { useEffect, useState } from 'react';

export interface GridConfig {
  simulatorUrl: string;
  numCannons: number;
  gridColumns: number;
}

/**
 * Fetch grid config from the runtime API route.
 * This allows a single UI build to serve different grid sizes
 * depending on which env vars the process was started with.
 */
export function useConfig(): GridConfig | null {
  const [config, setConfig] = useState<GridConfig | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: GridConfig) => setConfig(data))
      .catch(() =>
        setConfig({
          simulatorUrl: 'ws://localhost:3000',
          numCannons: 49,
          gridColumns: 7
        })
      );
  }, []);

  return config;
}
