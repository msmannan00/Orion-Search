import { TenantLocation } from './model/sidebar-settings.model';

export function getTenantLocationDisplay(tenant: TenantLocation): string {
  if (!tenant) {
    return '';
  }

  const { city, country } = tenant;
  if (city && country) {
    return `${city}, ${country}`;
  }

  if (city) {
    return city;
  }

  if (country) {
    return country;
  }

  return '';
}
