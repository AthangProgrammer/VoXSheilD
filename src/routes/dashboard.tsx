import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Spectrum } from "@/components/Spectrum";
import { getAudio, loadResult, type AnalysisResult } from "@/lib/voxguard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Analysis Dashboard — VoxGuard Voice Forensics" },
      {
        name: "description",
        content:
          "Review the deepfake verdict, confidence score, probability split and frequency spectrum of your analyzed recording.",
      },
      { property: "og:title", content: "Analysis Dashboard — VoxGuard" },
      {
        property: "og:description",
        content: "Verdict, confidence ring and live frequency spectrum for your analyzed audio.",
      },
    ],
  }),
  component: DashboardPage,
});

const NAV = [
  ["⌂", "Dashboard", "/dashboard"],
  ["↑", "Analyze", "/"],
] as const;

function DashboardPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const stored = loadResult();
    if (!stored) {
      void navigate({ to: "/" });
      return;
    }
    setResult(stored);
    void getAudio().then((audio) => setFile(audio ?? null));
  }, [navigate]);

  useEffect(() => {
    if (!file || !audioRef.current) return;
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!result) return null;

  const fake = result.prediction === "fake";
  const confidence = result.confidence * 100;
  const circumference = 2 * Math.PI * 50;

  return (
    <div className="flex min-h-screen">
      <aside className="glass-panel m-4 hidden w-64 shrink-0 flex-col justify-between rounded-3xl p-5 lg:flex">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              V
            </span>
            <span className="text-xs font-semibold tracking-[0.3em]">VOXGUARD</span>
          </div>

          <nav className="space-y-1">
            <p className="px-3 pb-2 text-[10px] tracking-[0.3em] text-muted-foreground">WORKSPACE</p>
            {NAV.map(([icon, label, to]) => (
              <Link
                key={label}
                to={to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
                activeProps={{
                  className:
                    "bg-sidebar-primary text-sidebar-primary-foreground font-semibold hover:bg-sidebar-primary",
                }}
              >
                <span aria-hidden>{icon}</span>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
          <span className="size-2 rounded-full bg-verdict-real" />
          <div className="text-xs">
            <strong className="block">Model online</strong>
            <small className="text-muted-foreground">Wav2Vec2 detector</small>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">
              VOICE FORENSICS
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold">Analysis dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-verdict-real" /> System operational
            </span>
            <Link
              to="/"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              + New analysis
            </Link>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="glass-panel space-y-8 p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">
                  ANALYSIS RESULT
                </span>
                <h2 className="mt-2 truncate font-display text-2xl font-semibold">
                  {result.filename}
                </h2>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground">
                ANALYZED
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-8">
              <div>
                <span className="text-[11px] tracking-[0.3em] text-muted-foreground">VERDICT</span>
                <h3
                  className={`font-display text-5xl font-bold ${
                    fake ? "text-verdict-fake" : "text-verdict-real"
                  }`}
                >
                  {result.prediction.toUpperCase()}
                </h3>
                <p className="text-sm text-muted-foreground">Model confidence</p>
              </div>

              <div className="relative size-36">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    strokeWidth="8"
                    className="stroke-secondary"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - result.confidence * circumference}
                    className={fake ? "stroke-verdict-fake" : "stroke-verdict-real"}
                  />
                </svg>
                <div className="absolute inset-0 grid place-content-center text-center">
                  <strong className="font-display text-xl">{confidence.toFixed(1)}%</strong>
                  <span className="text-[10px] tracking-widest text-muted-foreground">
                    confidence
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["Real voice", result.probabilities.real, "bg-verdict-real"],
                  ["Synthetic voice", result.probabilities.fake, "bg-verdict-fake"],
                ] as const
              ).map(([label, value, bar]) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <strong>{(value * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel space-y-4 p-7 text-center">
            <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">
              SOURCE AUDIO
            </span>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-2xl text-primary">
              ♪
            </div>
            <h3 className="truncate font-display text-lg font-semibold">{result.filename}</h3>
            <p className="text-sm text-muted-foreground">
              {file ? "Audio recording" : "Audio unavailable"}
            </p>
            <audio ref={audioRef} controls className="w-full" />
          </div>
        </section>

        <section className="glass-panel space-y-6 p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">
                AUDIO SPECTRUM
              </span>
              <h2 className="mt-2 font-display text-2xl font-semibold">Frequency analysis</h2>
              <p className="text-sm text-muted-foreground">
                Average spectrum of the recording, live while playing
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" /> Frequency · log scale
            </div>
          </div>

          <Spectrum audioRef={audioRef} file={file} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel space-y-4 p-7">
            <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">MODEL</span>
            <h2 className="font-display text-xl font-semibold">Detection model</h2>
            <dl className="divide-y divide-border text-sm">
              {[
                ["Architecture", "Wav2Vec2"],
                ["Sampling rate", "16 kHz"],
                ["Input", "Mono audio"],
                ["Threshold", "0.50"],
              ].map(([key, value]) => (
                <div key={key} className="flex justify-between py-3">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="glass-panel space-y-4 p-7">
            <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">SUMMARY</span>
            <h2 className="font-display text-xl font-semibold">Analysis overview</h2>
            <dl className="divide-y divide-border text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted-foreground">File</dt>
                <dd className="truncate font-medium">{result.filename}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-muted-foreground">Verdict</dt>
                <dd className={`font-semibold ${fake ? "text-verdict-fake" : "text-verdict-real"}`}>
                  {result.prediction.toUpperCase()}
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-muted-foreground">Confidence</dt>
                <dd className="font-medium">{confidence.toFixed(1)}%</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
    </div>
  );
}
