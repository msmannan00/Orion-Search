export type ExtensionState = 'checking' | 'ready' | 'signin' | 'install' | 'update' | 'unsupported';

export interface ExtensionPresence {
  source?: string;
  type?: string;
  loggedIn?: boolean;
  connected?: boolean;
  version?: string;
}
