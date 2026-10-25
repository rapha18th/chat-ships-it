export function canvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  worldWidth: number,
  worldHeight: number,
) {
  const scale = Math.min(rect.width / worldWidth, rect.height / worldHeight);
  const left = rect.left + (rect.width - worldWidth * scale) / 2,
    top = rect.top + (rect.height - worldHeight * scale) / 2;
  return {
    x: Math.max(0, Math.min(worldWidth, (clientX - left) / scale)),
    y: Math.max(0, Math.min(worldHeight, (clientY - top) / scale)),
  };
}
