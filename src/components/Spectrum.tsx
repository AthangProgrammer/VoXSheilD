import { useEffect, useRef, useState } from "react";
import { bandEdges, computeSpectrum } from "@/lib/fft";

const BARS = 72;

type Props = {
  /** The audio element whose live playback should drive the bars. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** The source file, used to render a static spectrum before playback. */
  file?: File | null;
};

export function Spectrum({ audioRef, file }: Props) {
  const [values, setValues] = useState<number[]>(() => new Array(BARS).fill(0));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const staticRef = useRef<number[]>(new Array(BARS).fill(0));

  /* Static spectrum from the decoded file, so the graph is never empty. */
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buffer);
        await ctx.close();
        if (cancelled) return;
        const spectrum = computeSpectrum(decoded, BARS);
        staticRef.current = spectrum;
        setValues(spectrum);
      } catch (error) {
        console.error("Spectrum decode failed", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  /* Live analyser during playback. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const ensureGraph = () => {
      if (!contextRef.current) {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        contextRef.current = ctx;
        analyserRef.current = analyser;
      }
      if (contextRef.current.state === "suspended") {
        void contextRef.current.resume();
      }
    };

    const draw = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      const edges = bandEdges(analyser.frequencyBinCount, BARS);
      const next: number[] = [];
      for (let b = 0; b < BARS; b++) {
        const from = edges[b]!;
        const to = Math.max(from + 1, edges[b + 1]!);
        let sum = 0;
        for (let i = from; i < to; i++) sum += data[i]!;
        next.push(sum / (to - from) / 255);
      }
      setValues(next);
      drawWaveform(analyser);
      frameRef.current = requestAnimationFrame(draw);
    };

    const drawWaveform = (analyser: AnalyserNode) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      ctx.beginPath();
      const slice = width / data.length;
      for (let i = 0; i < data.length; i++) {
        const value = data[i]! / 128 - 1;
        const y = height / 2 + (value * height) / 2;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * slice, y);
      }
      ctx.strokeStyle =
        getComputedStyle(canvas).getPropertyValue("--verdict-real").trim() ||
        "oklch(0.5 0.075 148)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const onPlay = () => {
      ensureGraph();
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(draw);
    };

    const onStop = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setValues(staticRef.current);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [audioRef]);

  return (
    <div className="space-y-4">
      <div className="flex h-52 items-end gap-[3px] rounded-xl bg-secondary/30 p-4">
        {values.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-full bg-gradient-to-t from-primary/35 via-primary to-verdict-real transition-[height] duration-100 ease-out"
            style={{ height: `${4 + Math.pow(value, 0.7) * 96}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[11px] tracking-widest text-muted-foreground">
        <span>0 Hz</span>
        <span>250 Hz</span>
        <span>1 kHz</span>
        <span>3 kHz</span>
        <span>8 kHz</span>
        <span>20 kHz</span>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-2">
        <canvas ref={canvasRef} className="h-24 w-full" />
      </div>
    </div>
  );
}
