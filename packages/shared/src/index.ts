export type Address = `0x${string}`;

export type PlotId = string;

export interface Plot {
  id: PlotId;
  name: string;
  areaSqm: number;
  enabled?: boolean; // false means "outside boundary" (or otherwise unavailable)

  // Georeferenced polygon in [lng,lat] pairs (WGS84). Use once we have real GIS.
  polygon?: Array<[number, number]>;

  // MVP: polygon in **image-normalised** coordinates [x,y] where 0..1 spans the map image.
  // This lets us overlay plot boundaries on a static brochure map without georeferencing.
  polygonImage?: Array<[number, number]>;
}

export interface EntitlementSnapshot {
  wallet: Address;
  epochStart: string; // ISO
  epochEnd: string; // ISO
  tokenBalance: string; // stringified bigint
  totalSupply: string; // stringified bigint
  opsCreditsPerWeek: number;
  opsCreditsEntitled: number;
  virtualAreaSqm: number;
}

export type WorkRequestType =
  | 'irrigation_plan'
  | 'harvest_plan'
  | 'scouting_plan'
  | 'maintenance_checklist'
  | 'generic';

export interface WorkRequest {
  id: string;
  createdAt: string; // ISO
  wallet: Address;
  plotIds: PlotId[];
  type: WorkRequestType;
  prompt: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
}

export interface Artifact {
  id: string;
  workRequestId: string;
  kind: 'markdown' | 'json' | 'text';
  filename: string;
  content: string;
}

// Re-export platform constants + helpers
export * from './config.js';
export * from './entitlement.js';
export * from './id.js';
