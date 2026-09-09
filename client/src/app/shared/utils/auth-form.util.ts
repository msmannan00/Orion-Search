
import type { PasswordChecks, PasswordEvaluation, PasswordStrength } from './model/auth-form.model';
export type { PasswordChecks, PasswordEvaluation, PasswordStrength } from './model/auth-form.model';






export function createEmptyPasswordChecks(): PasswordChecks {
  return {
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    specialChar: false
  };
}

export function areAllPasswordRequirementsMet(passwordChecks: PasswordChecks): boolean {
  return Object.values(passwordChecks).every(value => value);
}

export function buildUsernameSuggestions(username: string, usernamePattern: RegExp): string[] {
  const suggestions: string[] = [];
  const base = username || '';
  let counter = 1;

  while (suggestions.length < 4 && counter < 50) {
    const suffix = counter.toString();
    let normalized = base.toLowerCase();

    if (!/^[A-Za-z]/.test(normalized)) {
      normalized = `u${normalized}`;
    }

    normalized = normalized.replace(/[^A-Za-z0-9_-]/g, '');

    if (normalized.length > 20 - suffix.length) {
      normalized = normalized.slice(0, 20 - suffix.length);
    }

    if (normalized.length < 8 - suffix.length) {
      normalized = normalized.padEnd(8 - suffix.length, '0');
    }

    const suggestion = `${normalized}${suffix}`;
    if (usernamePattern.test(suggestion) && !suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }

    counter++;
  }

  return suggestions;
}

export function buildUsernameSuggestionText(suggestions: string[]): string {
  if (suggestions.length > 0) {
    return `Username already taken. Suggested usernames: ${suggestions.join(', ')}`;
  }
  return 'Username already taken.';
}

export function evaluatePasswordInput(password: string): PasswordEvaluation {
  const passwordChecks: PasswordChecks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password)
  };

  const checkOrder = [
    { key: 'length', message: 'At least 8 characters' },
    { key: 'lowercase', message: 'At least one lowercase letter' },
    { key: 'uppercase', message: 'At least one uppercase letter' },
    { key: 'number', message: 'At least one number' },
    { key: 'specialChar', message: 'At least one special character' }
  ] as const;

  const currentUnmetCheck = checkOrder.find(check => !passwordChecks[check.key])?.message ?? null;
  const allPasswordRequirementsMet = areAllPasswordRequirementsMet(passwordChecks);

  let strengthLevel: PasswordStrength = 'weak';
  if (allPasswordRequirementsMet) {
    if (password.length >= 12 && passwordChecks.specialChar && passwordChecks.number) {
      strengthLevel = 'strong';
    }
    else if (password.length >= 10) {
      strengthLevel = 'medium';
    }
  }

  return {
    showPasswordMeter: password.length > 0,
    passwordChecks,
    currentUnmetCheck,
    passwordStrength: strengthLevel,
    allPasswordRequirementsMet
  };
}
