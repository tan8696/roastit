export function meanAbsoluteError(pairs: [number, number][]): number {
  if (pairs.length === 0) return NaN;
  const sum = pairs.reduce((acc, [a, b]) => acc + Math.abs(a - b), 0);
  return sum / pairs.length;
}

export function pearsonCorrelation(pairs: [number, number][]): number {
  const n = pairs.length;
  if (n < 2) return NaN;
  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    denX = 0,
    denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? NaN : num / den;
}
