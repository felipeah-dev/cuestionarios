export const PROCTORING_STORAGE_ROOT = "storage/proctoring";
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
export const ALLOWED_SNAPSHOT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// ─── Cámara ───────────────────────────────────────────────────────────────────

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

// ─── Sistema de faltas ────────────────────────────────────────────────────────

/**
 * Número de faltas acumuladas (cámara + ruido) antes de bloquear el examen.
 * Al llegar a este límite el intento pasa a PAUSADO_REVISION_IA.
 */
export const MAX_FAULTS_BEFORE_BLOCK = 2;

// ─── Detección de ruido ───────────────────────────────────────────────────────

/**
 * Margen en dB sobre el baseline calibrado que dispara la alerta de ruido (+6 dB ≈ 2.0x).
 * En combinación con el filtro pasa-banda vocal (300Hz-3400Hz), detecta susurros y murmullo.
 */
export const NOISE_DB_OVER_BASELINE = 6;
export const NOISE_RMS_MULTIPLIER = Math.pow(10, NOISE_DB_OVER_BASELINE / 20); // ≈ 2.0x

/**
 * Piso mínimo absoluto de RMS (0.012) para capturar voz susurrada y murmullo.
 */
export const MIN_NOISE_RMS_FLOOR = 0.012;

/** Milisegundos que el ruido debe sostenerse sobre el umbral para generar una falta. */
export function getNoiseSustainedMs() {
  return getEnvNumber("NOISE_SUSTAINED_MS", 3000);
}

/** Milisegundos de audio a grabar cuando se confirma una falta de ruido. */
export function getNoiseRecordingMs() {
  return getEnvNumber("NOISE_RECORDING_MS", 5000);
}

/** Milisegundos de cooldown entre alertas de ruido para evitar cascadas. */
export function getNoiseCooldownMs() {
  return getEnvNumber("NOISE_COOLDOWN_MS", 5000);
}

/** Milisegundos de calibración al inicio del examen (durante este tiempo no corre el timer). */
export function getNoiseCalibrationMs() {
  return getEnvNumber("NOISE_CALIBRATION_MS", 5000);
}

/** Tamaño máximo permitido para una grabación de audio de evidencia. */
export const MAX_NOISE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_NOISE_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
] as const;

// ─── Helpers privados ─────────────────────────────────────────────────────────

function getEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
