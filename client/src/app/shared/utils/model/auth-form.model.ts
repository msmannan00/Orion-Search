export type PasswordStrength = 'weak' | 'medium' | 'strong' | null;

export interface PasswordChecks {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    specialChar: boolean;
}

export interface PasswordEvaluation {
    showPasswordMeter: boolean;
    passwordChecks: PasswordChecks;
    currentUnmetCheck: string | null;
    passwordStrength: PasswordStrength;
    allPasswordRequirementsMet: boolean;
}
