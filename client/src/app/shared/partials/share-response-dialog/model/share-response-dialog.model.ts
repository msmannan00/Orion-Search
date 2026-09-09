export type ShareTarget = 'telegram' | 'x' | 'linkedin' | 'reddit' | 'email';

export interface ShareDestination {
  target: ShareTarget;
  label: string;
  icon: string;
  iconClass: string;
}
