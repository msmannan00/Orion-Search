export interface SatelliteGeocodeResult {
  name:         string;
  display_name: string;
  lat:          number;
  lon:          number;
  delta:        number;
  type:         string;
  class:        string;
}

export interface SatelliteGeocodeResponse {
  status?:  string;
  message?: string;
  result?: {
    status:  string;
    results: SatelliteGeocodeResult[];
    error_message?: string;
    message?: string;
  };
  results?: SatelliteGeocodeResult[];
}

export interface SatelliteFacilityFeature {
  type:     'Feature';
  geometry: {
    type:        string;
    coordinates: unknown;
  };
  properties: {
    osm_id: number;
    kind:   string;
    name:   string;
  };
}

export interface SatelliteFacilitiesResponse {
  status?:  string;
  result?: {
    status:       string;
    type:         string;
    features:     SatelliteFacilityFeature[];
    total:        number;
    type_counts:  Record<string, number>;
    overpass_ok:  boolean;
    warning?:     string;
  };
}

export interface SatelliteImageResult {
  status:        string;
  lat?:          number;
  lon?:          number;
  delta?:        number;
  bbox?:         number[];
  month?:        string | null;
  image_type?:   string;
  size?:         number;
  image_url?:    string | null;
  data_url?:     string | null;
  image_base64?: string | null;
  mime_type?:    string | null;
  content_type?: string | null;
  [key: string]: unknown;
}

export interface SatelliteImageResponse {
  status?: string;
  result?: SatelliteImageResult;
}

export interface SatelliteMonthScore {
  month:       string;
  month_key:   string;
  date_from:   string;
  date_to:     string;
  ndvi_score:  number | null;
  has_data:    boolean;
}

export interface SatelliteAnomalyResponse {
  status?:  string;
  result?: {
    status:        string;
    lat:           number;
    lon:           number;
    bbox:          number[];
    months:        SatelliteMonthScore[];
    delta_score:   number;
    alert_level:   'critical' | 'warning' | 'nominal' | 'unknown';
    alert_colour:  string;
  };
}

export interface SatelliteCompareMonth {
  month_key:  string;
  label:      string;
  image_url:  string;
}

export interface SatelliteCompareResponse {
  status?:  string;
  result?: {
    status:      string;
    lat:         number;
    lon:         number;
    delta:       number;
    image_type:  string;
    months:      SatelliteCompareMonth[];
  };
}

export interface SatelliteLiveAircraft {
  icao24:          string;
  callsign?:       string | null;
  origin_country?: string | null;
  latitude?:       number | null;
  longitude?:      number | null;
  velocity?:       number | null;
  true_track?:     number | null;
  baro_altitude?:  number | null;
  geo_altitude?:   number | null;
  vertical_rate?:  number | null;
  on_ground?:      boolean | null;
  category?:       number | null;
  track?:          { path?: unknown[] } | null;
  path?:           unknown[] | null;
}

export interface SatelliteLiveAircraftBBoxResponse {
  status?:      string;
  error?:       string;
  retry_after?: number;
  count?:       number;
  cached?:      boolean;
  aircraft?:    SatelliteLiveAircraft[];
  result?: {
    status?:      string;
    error?:       string;
    retry_after?: number;
    count?:       number;
    cached?:      boolean;
    aircraft?:    SatelliteLiveAircraft[];
  };
}

export interface SatelliteLiveShip {
  mmsi:          string;
  name?:         string | null;
  latitude?:     number | null;
  longitude?:    number | null;
  speed?:        number | null;
  course?:       number | null;
  true_heading?: number | null;
  nav_status?:   number | null;
  call_sign?:    string | null;
  destination?:  string | null;
  ship_type?:    number | null;
}

export interface SatelliteLiveShipsBBoxResponse {
  status?:      string;
  error?:       string;
  retry_after?: number;
  count?:       number;
  ships?:       SatelliteLiveShip[];
  result?: {
    status?:      string;
    error?:       string;
    retry_after?: number;
    count?:       number;
    ships?:       SatelliteLiveShip[];
  };
}
