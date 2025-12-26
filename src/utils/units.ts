export const MM_PER_INCH = 25.4;
export const POINTS_PER_INCH = 72;

export function mmToPixels(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

export function mmToPoints(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

export function paperSizeMm(
  size: 'A4' | 'Letter' | 'A3' | 'Tabloid',
  orientation: 'portrait' | 'landscape' = 'portrait'
): { width: number; height: number } {
  const base =
    size === 'Letter'
      ? { width: 215.9, height: 279.4 }
      : size === 'A3'
      ? { width: 297, height: 420 }
      : size === 'Tabloid'
      ? { width: 279.4, height: 431.8 }
      : { width: 210, height: 297 };
  return orientation === 'portrait' ? base : { width: base.height, height: base.width };
}
