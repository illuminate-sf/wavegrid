/**
 * Types for the zone-to-grid mapper.
 */

/** A single cell in the zone mapping. */
export interface MappingCell {
  /** Grid position (row * cols + col). */
  pos: number;
  /** Row index. */
  row: number;
  /** Column index. */
  col: number;
  /** BEYOND zone index this cell maps to. */
  index: number;
  /** Human-readable name (e.g. "A1", "B3"). */
  name: string;
  /** Target BEYOND instance name. */
  target: string;
}

/** Full zone mapping document. */
export interface ZoneMapping {
  rows: number;
  cols: number;
  cells: MappingCell[];
}

/** OSC target (BEYOND instance). */
export interface OscTarget {
  host: string;
  port: number;
}

/** Configuration for the mapper server. */
export interface MapperConfig {
  /** HTTP port for the mapper UI. Default 8091. */
  port?: number;
  /** Path to mapping.json on disk. */
  mappingPath: string;
  /** Path to mapper.html UI file. */
  htmlPath: string;
  /** Named OSC targets. */
  targets?: Record<string, OscTarget>;
  /** Grid rows. Default 7. */
  rows?: number;
  /** Grid columns. Default 7. */
  cols?: number;
  /** Flash color [R, G, B]. Default [255, 255, 255]. */
  flashColor?: [number, number, number];
  /** Flash blink rate in Hz. Default 2. */
  flashHz?: number;
  /** Called when a flash starts (e.g. to pause pattern playback). */
  onFlashStart?: () => void;
  /** Called when a flash ends. */
  onFlashEnd?: () => void;
  /** Logger. */
  log?: (msg: string) => void;
}
