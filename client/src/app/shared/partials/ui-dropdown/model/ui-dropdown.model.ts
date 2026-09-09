export interface UiDropdownOption {
  key: string;
  label: string;
}

export interface UiDropdownMenuOption {
  key: string | null;
  label: string;
  trackKey: string;
  testKey: string | null;
}
