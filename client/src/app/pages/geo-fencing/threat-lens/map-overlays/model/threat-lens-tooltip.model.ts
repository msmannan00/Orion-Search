export interface TooltipPointerEvent {
  native?: { clientX?: number; clientY?: number };
  clientX?: number;
  clientY?: number;
  touches?: ArrayLike<{ clientX?: number; clientY?: number }>;
  x?: number;
  y?: number;
}
