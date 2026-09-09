export interface StreamedMapEntity extends Record<string, unknown> {
  id?: string;
  _id?: string;
  name?: string;
  type?: string;
  primary_fuel?: string;
  country?: string;
  capacity_mw?: number;
  source?: string;
  location?: { lat?: unknown; lon?: unknown };
  location_point?: { lat?: unknown; lon?: unknown };
  lat?: unknown;
  lon?: unknown;
}
