import { createCanvas, Image, CanvasRenderingContext2D } from 'canvas';

export type TextMetrics = {
  ascent: number;
  descent: number;
  baseline: number;
  height: number;
  width: number;
};

export function measureText(text: string, fontSize: number): TextMetrics {
  const canvas = createCanvas(0, 0);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context');
  }
  ctx.font = `${fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const baseline = metrics.actualBoundingBoxAscent;
  return {
    ascent: ascent,
    descent: descent,
    baseline: baseline,
    height: ascent + descent,
    width: metrics.width,
  };
}
