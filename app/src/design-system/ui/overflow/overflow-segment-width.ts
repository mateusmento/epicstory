export function resolveSegmentNaturalWidth(options: {
  measuredWidthPx: number;
  declaredWidthPx?: number;
  maxWidthPx?: number;
}): number {
  const { measuredWidthPx, declaredWidthPx, maxWidthPx } = options;
  let width = declaredWidthPx != null && declaredWidthPx > 0 ? declaredWidthPx : measuredWidthPx;
  if (maxWidthPx != null && maxWidthPx > 0) {
    width = Math.min(width, maxWidthPx);
  }
  return width;
}
