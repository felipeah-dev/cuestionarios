export const PROCTORING_STORAGE_ROOT = "storage/proctoring";
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
export const ALLOWED_SNAPSHOT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function getProctoringCaptureMinSeconds() {
  return getEnvNumber("PROCTORING_CAPTURE_MIN_SECONDS", 45);
}

export function getProctoringCaptureMaxSeconds() {
  const min = getProctoringCaptureMinSeconds();
  return Math.max(min, getEnvNumber("PROCTORING_CAPTURE_MAX_SECONDS", 70));
}

export function getProctoringHighConfidenceThreshold() {
  return clamp(getEnvNumber("PROCTORING_HIGH_CONFIDENCE_THRESHOLD", 0.8), 0, 1);
}

export function getGeminiProctoringModel() {
  return process.env.GEMINI_PROCTORING_MODEL || "gemini-2.5-flash";
}

function getEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
