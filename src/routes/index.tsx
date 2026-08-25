import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { API_URL, formatFileSize, saveAudio, saveResult, type AnalysisResult } from "@/lib/voxguard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoxGuard — AI Voice Deepfake Detection" },
      {
        name: "description",
        content:
          "Upload a recording and let the Wav2Vec2 detector score it for synthetic or manipulated speech in seconds.",
      },
      { property: "og:title", content: "VoxGuard — AI Voice Deepfake Detection" },
      {
        property: "og:description",
        content: "AI voice forensics: detect synthetic speech with confidence scoring and spectrum analysis.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = (next: File | undefined | null) => {
    if (!next) return;
    if (next.size > 25 * 1024 * 1024) {
      toast.error("File is larger than 25 MB.");
      return;
    }
    setFile(next);
  };

  const reset = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!file) {
      toast.error("Please select an audio file first.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_URL}/api/analyze`, { method: "POST", body });
      const result = (await response.json()) as AnalysisResult;
      if (!response.ok || !result.success) throw new Error(result.error || "Analysis failed");
      await saveAudio(file);
      saveResult(result);
      void navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(`Analysis failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Toaster />
      <main className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
        <section className="space-y-10">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              V
            </span>
            <span className="text-sm font-semibold tracking-[0.3em]">VOXGUARD</span>
          </div>

          <div className="space-y-6">
            <p className="text-xs font-semibold tracking-[0.35em] text-primary">AI VOICE FORENSICS</p>
            <h1 className="font-display text-5xl leading-tight font-semibold">
              Detect <span className="text-gradient-emerald">synthetic voices.</span>
            </h1>
            <p className="max-w-md text-muted-foreground">
              Upload an audio recording and let our AI model analyze it for signs of synthetic or
              manipulated speech.
            </p>

            <div className="space-y-4">
              {[
                ["AI powered", "Wav2Vec2 voice analysis"],
                ["Frequency analysis", "Inspect the audio spectrum"],
                ["Instant results", "Real-time confidence scoring"],
              ].map(([title, sub]) => (
                <div key={title} className="flex items-center gap-4">
                  <span className="grid size-10 place-items-center rounded-full bg-accent text-primary">
                    ◈
                  </span>
                  <div>
                    <strong className="block text-sm">{title}</strong>
                    <small className="text-muted-foreground">{sub}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-10 border-t border-border pt-6 text-xs tracking-widest text-muted-foreground">
            <span>
              MODEL <strong className="ml-2 text-foreground">WAV2VEC2</strong>
            </span>
            <span>
              STATUS <strong className="ml-2 text-verdict-real">● ONLINE</strong>
            </span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="glass-panel space-y-6 p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold tracking-[0.3em] text-primary">
                  AUDIO ANALYSIS
                </span>
                <h2 className="mt-2 font-display text-2xl font-semibold">Upload a recording</h2>
                <p className="text-sm text-muted-foreground">MP3, WAV, M4A or FLAC</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-verdict-real">
                ● Secure
              </span>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                pick(event.dataTransfer.files[0]);
              }}
              className={`rounded-2xl border border-dashed p-8 text-center transition-colors ${
                dragging ? "border-primary bg-primary/10" : "border-border bg-secondary/25"
              }`}
            >
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-accent text-2xl text-primary">
                ↑
              </div>
              <h3 className="font-display text-lg font-semibold">Drop your audio here</h3>
              <p className="text-sm text-muted-foreground">or browse files from your computer</p>

              <input
                ref={inputRef}
                type="file"
                accept=".wav,.mp3,.m4a,.flac,audio/*"
                className="hidden"
                onChange={(event) => pick(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-5 inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Browse files
              </button>

              <p className={`mt-4 text-sm ${file ? "text-verdict-real" : "text-muted-foreground"}`}>
                {file ? file.name : "No file selected"}
              </p>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Supported <strong className="text-foreground">WAV · MP3 · M4A · FLAC</strong>
              </span>
              <span>
                Maximum <strong className="text-foreground">25 MB</strong>
              </span>
            </div>

            {file ? (
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
                <span className="grid size-10 place-items-center rounded-full bg-accent text-primary">
                  ♪
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{file.name}</strong>
                  <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Remove file"
                  className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={analyze}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <span>{busy ? "Analyzing..." : "Analyze audio"}</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            ⌁ Your audio is processed temporarily and removed after analysis.
          </p>
        </section>
      </main>
    </div>
  );
}
