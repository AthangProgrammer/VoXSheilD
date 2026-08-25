export const API_URL =
  (import.meta.env['VITE_API_URL'] as string | undefined) ?? "http://127.0.0.1:8000";

export type AnalysisResult = {
  success: boolean;
  filename: string;
  prediction: "real" | "fake";
  confidence: number;
  probabilities: { real: number; fake: number };
  error?: string;
};

const DB_NAME = "VoxGuardDB";
const STORE = "audio";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudio(file: File) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, "latest");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudio(): Promise<File | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get("latest");
    req.onsuccess = () => resolve(req.result as File | undefined);
    req.onerror = () => reject(req.error);
  });
}

export function saveResult(result: AnalysisResult) {
  localStorage.setItem("analysisResult", JSON.stringify(result));
}

export function loadResult(): AnalysisResult | null {
  const raw = localStorage.getItem("analysisResult");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
