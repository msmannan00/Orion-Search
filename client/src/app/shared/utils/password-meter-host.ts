import { PasswordChecks, PasswordStrength, areAllPasswordRequirementsMet, createEmptyPasswordChecks, evaluatePasswordInput } from './auth-form.util';

export abstract class PasswordMeterHost {
  passwordStrength: PasswordStrength = null;
  showPasswordMeter = false;
  passwordChecks: PasswordChecks = createEmptyPasswordChecks();
  currentUnmetCheck: string | null = null;

  onPasswordInput(password: string): void {
    const evaluation = evaluatePasswordInput(password);
    this.showPasswordMeter = evaluation.showPasswordMeter;
    this.passwordChecks = evaluation.passwordChecks;
    this.currentUnmetCheck = evaluation.currentUnmetCheck;
    this.passwordStrength = evaluation.passwordStrength;
  }

  get allPasswordRequirementsMet(): boolean {
    return areAllPasswordRequirementsMet(this.passwordChecks);
  }

  resetPasswordMeter(): void {
    this.passwordStrength = null;
    this.showPasswordMeter = false;
    this.passwordChecks = createEmptyPasswordChecks();
    this.currentUnmetCheck = null;
  }
}
