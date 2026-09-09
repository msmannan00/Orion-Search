export interface GeoLocationSearchResult {
  name:          string;
  display_name?: string;
  lat:           number;
  lon:           number;
  delta?:        number;
}
