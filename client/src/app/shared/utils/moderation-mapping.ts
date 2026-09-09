
import type { ModerationMapping } from './model/moderation-mapping.model';
export type { ModerationMapping } from './model/moderation-mapping.model';


export const MODERATION_CONFIG: Record<string, ModerationMapping> = {
  safe: {
    label: 'safe',
    displayText: 'Safe',
    iconClass: 'bi bi-shield-check',
    colorClasses: 'border-green-500/20 bg-green-500/10 text-green-600 [body.light-theme_&]:text-green-700',
    tooltipText: 'Content is safe',
  },
  offensive: {
    label: 'offensive',
    displayText: 'Offensive Language',
    iconClass: 'bi bi-exclamation-triangle-fill',
    colorClasses: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 [body.light-theme_&]:text-yellow-700',
    tooltipText: 'Potential offensive or toxic language detected',
  },
  hate_speech: {
    label: 'hate_speech',
    displayText: 'Potential Hate Speech',
    iconClass: 'bi bi-sign-stop-fill',
    colorClasses: 'border-red-500/30 bg-red-500/10 text-red-600 [body.light-theme_&]:text-red-700',
    tooltipText: 'Severe toxicity, threat, or identity-targeted hate detected',
  },
};
