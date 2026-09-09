const ASCII_ALPHANUMERIC_HYPHEN = /^[a-z0-9-]+$/i;
const ASCII_DIGITS = /^\d+$/;
const ASCII_EMAIL_LOCAL_PART = /^[a-z0-9._%+-]+$/i;
const ASCII_HEX_GROUP = /^[0-9a-f]{1,4}$/i;

export const EMAIL_ADDRESS_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{1,63}$/;
export const DOMAIN_NAME_PATTERN = /^(?!:\/\/)(?!\.)(?!.*\.\.)[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,63}$/;
export const IPV4_ADDRESS_PATTERN = /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

export function isIpv4Address(value: string): boolean {
  const octets = value.split('.');
  return octets.length === 4 && octets.every(octet => {
    if (!ASCII_DIGITS.test(octet) || octet.length > 3) {
      return false;
    }
    const numeric = Number(octet);
    return numeric >= 0 && numeric <= 255;
  });
}

export function isIpv6Address(value: string): boolean {
  const input = value.trim();
  if (!input || !input.includes(':') || input.includes('.')) {
    return false;
  }

  const compressedParts = input.split('::');
  if (compressedParts.length > 2) {
    return false;
  }

  const left = compressedParts[0] ? compressedParts[0].split(':') : [];
  const right = compressedParts.length === 2 && compressedParts[1] ? compressedParts[1].split(':') : [];
  const groups = [...left, ...right];
  if (!groups.every(group => ASCII_HEX_GROUP.test(group))) {
    return false;
  }
  return compressedParts.length === 2 ? groups.length < 8 : groups.length === 8;
}

export function isDomainName(value: string): boolean {
  const domain = value.trim();
  if (!domain || domain.length > 253 || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }
  const topLevelDomain = labels[labels.length - 1];
  if (topLevelDomain.length < 2 || topLevelDomain.length > 63 || !Array.from(topLevelDomain).every(character => /[a-z]/i.test(character))) {
    return false;
  }
  return labels.every(label => label.length > 0 && label.length <= 63 && ASCII_ALPHANUMERIC_HYPHEN.test(label) && !label.startsWith('-') && !label.endsWith('-'));
}

export function isEmailAddress(value: string): boolean {
  const parts = value.split('@');
  if (parts.length !== 2) {
    return false;
  }
  const [localPart, domain] = parts;
  return localPart.length <= 64 && ASCII_EMAIL_LOCAL_PART.test(localPart) && isDomainName(domain);
}

export function isDottedIdentifier(value: string): boolean {
  const labels = value.split('.');
  return labels.length > 1 && labels.every(label => label.length > 0 && /[a-z]/i.test(label[0]) && Array.from(label.slice(1)).every(character => /[a-z0-9_]/i.test(character)));
}

export function isDecimalString(value: string): boolean {
  const parts = value.split('.');
  return parts.length <= 2 && parts.every(part => part.length > 0 && ASCII_DIGITS.test(part));
}
