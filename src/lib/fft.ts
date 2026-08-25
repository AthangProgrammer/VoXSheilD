/**
 * Minimal radix-2 FFT + helpers used to compute a static frequency spectrum
 * from a decoded AudioBuffer (so the graph is visible without playback).
 */

function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** Log-spaced band edges (bin indices) across the usable spectrum. */
export function bandEdges(binCount: number, bars: number, minBin = 1) {
  const edges: number[] = [];
  for (let i = 0; i <= bars; i++) {
    const t = i / bars;
    const bin = Math.round(minBin * Math.pow(binCount / minBin, t));
    edges.push(Math.min(bin, binCount - 1));
  }
  return edges;
}

/**
 * Average magnitude spectrum of an AudioBuffer, reduced to `bars`
 * log-spaced bands, normalised to 0..1.
 */
export function computeSpectrum(buffer: AudioBuffer, bars = 72): number[] {
  const channel = buffer.getChannelData(0);
  const size = 2048;
  const windows = Math.max(1, Math.min(120, Math.floor(channel.length / size)));
  const step = Math.max(size, Math.floor(channel.length / windows));
  const half = size / 2;
  const mags = new Float32Array(half);

  const hann = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }

  let used = 0;
  for (let w = 0; w < windows; w++) {
    const start = w * step;
    if (start + size > channel.length) break;
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    for (let i = 0; i < size; i++) re[i] = channel[start + i] * hann[i];
    fft(re, im);
    for (let i = 0; i < half; i++) {
      mags[i] += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    }
    used++;
  }
  if (used === 0) return new Array(bars).fill(0);

  // Convert to dB, then to 0..1
  const db = new Float32Array(half);
  let max = -Infinity;
  for (let i = 0; i < half; i++) {
    db[i] = 20 * Math.log10(mags[i] / used + 1e-9);
    if (db[i] > max) max = db[i];
  }

  const edges = bandEdges(half, bars);
  const out: number[] = [];
  for (let b = 0; b < bars; b++) {
    const from = edges[b];
    const to = Math.max(from + 1, edges[b + 1]);
    let sum = 0;
    for (let i = from; i < to; i++) sum += db[i];
    const avg = sum / (to - from);
    const range = 60; // dB dynamic range shown
    out.push(Math.max(0, Math.min(1, (avg - (max - range)) / range)));
  }
  return out;
}
