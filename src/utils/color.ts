/**
 * Pick a readable text colour (dark navy or white) for a given background hex,
 * based on its perceived luminance. Used for the coloured file labels so the
 * heading stays legible whether the swatch is bright (sky/neon) or dark (navy).
 */
export function contrastText(hex: string): string {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return '#ffffff';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#04044a' : '#ffffff';
}
