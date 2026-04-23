let measureCtx: CanvasRenderingContext2D | null = null;

export function measureTextWidth(text: string, fontName: string, size: number): number {
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d", { willReadFrequently: true });
  }

  let est = 0;
  for (let i = 0; i < text.length; i++) {
    // Full-width (CJK) roughly 1em, ASCII roughly 0.6em
    est += text.charCodeAt(i) > 255 ? size : size * 0.6;
  }

  let width = 0;
  if (measureCtx) {
    const cleanFont = fontName.replace(/["']/g, "");
    const isGeneric = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(cleanFont.toLowerCase());
    const safeFont = isGeneric ? cleanFont : `"${cleanFont}"`;
    measureCtx.font = `${size}px ${safeFont}, "Yu Gothic", "Meiryo", sans-serif`;
    width = measureCtx.measureText(text).width;
  }
  
  // If canvas returned 0 or severely underestimated (e.g. invalid font string caused fallback to 10px),
  // enforce the estimate as a lower bound.
  if (!width || width < est * 0.5) {
    width = est;
  }

  return width;
}
