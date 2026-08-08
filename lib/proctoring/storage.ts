import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ALLOWED_NOISE_MIME_TYPES,
  ALLOWED_SNAPSHOT_MIME_TYPES,
  MAX_NOISE_BYTES,
  MAX_SNAPSHOT_BYTES,
  PROCTORING_STORAGE_ROOT,
} from "@/lib/proctoring/config";
import {
  isDriveEvidenceReference,
  readDriveEvidence,
  uploadDriveEvidence,
} from "@/lib/proctoring/drive-storage";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SaveSnapshotInput = {
  intentoId: string;
  nombreAlumno: string;
  bytes: Buffer;
  mimeType: string;
};

type SaveNoiseInput = {
  intentoId: string;
  nombreAlumno: string;
  bytes: Buffer;
  mimeType: string;
};

// ─── Validación ───────────────────────────────────────────────────────────────

export function assertValidSnapshot(bytes: Buffer, mimeType: string) {
  const cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_SNAPSHOT_MIME_TYPES.includes(cleanMime as never)) {
    throw new Error("Tipo de imagen no permitido");
  }
  if (bytes.byteLength === 0) {
    throw new Error("La imagen esta vacia");
  }
  if (bytes.byteLength > MAX_SNAPSHOT_BYTES) {
    throw new Error("La imagen excede el tamano maximo permitido");
  }
}

export function assertValidNoise(bytes: Buffer, mimeType: string) {
  const cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_NOISE_MIME_TYPES.includes(cleanMime as never)) {
    throw new Error("Tipo de audio no permitido");
  }
  if (bytes.byteLength === 0) {
    throw new Error("El audio esta vacio");
  }
  if (bytes.byteLength > MAX_NOISE_BYTES) {
    throw new Error("El audio excede el tamano maximo permitido");
  }
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export async function saveProctoringSnapshot({
  intentoId,
  nombreAlumno,
  bytes,
  mimeType,
}: SaveSnapshotInput) {
  assertValidSnapshot(bytes, mimeType);

  const extension = getExtensionForMimeType(mimeType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const alumnoDir = sanitizeAlumnoName(nombreAlumno);
  const fileName = `${alumnoDir}-${intentoId}-foto-${timestamp}.${extension}`;

  return saveToDrive(fileName, bytes, mimeType);
}

export async function saveNoiseRecording({
  intentoId,
  nombreAlumno,
  bytes,
  mimeType,
}: SaveNoiseInput) {
  assertValidNoise(bytes, mimeType);

  const extension = getExtensionForAudioMimeType(mimeType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const alumnoDir = sanitizeAlumnoName(nombreAlumno);
  const fileName = `${alumnoDir}-${intentoId}-ruido-${timestamp}.${extension}`;

  return saveToDrive(fileName, bytes, mimeType);
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

export async function readProctoringEvidence(reference: string) {
  if (isDriveEvidenceReference(reference)) {
    return readDriveEvidence(reference);
  }

  const storageRoot = path.resolve(PROCTORING_STORAGE_ROOT);
  const absolutePath = path.resolve(PROCTORING_STORAGE_ROOT, reference);
  const pathFromRoot = path.relative(storageRoot, absolutePath);

  if (pathFromRoot.startsWith("..") || path.isAbsolute(pathFromRoot)) {
    throw new Error("Ruta de evidencia invalida");
  }

  return {
    bytes: await readFile(absolutePath),
    mimeType: getEvidenceMimeTypeFromPath(reference),
  };
}

// ─── MIME helpers ─────────────────────────────────────────────────────────────

export function getEvidenceMimeTypeFromPath(reference: string) {
  const extension = path.extname(reference).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".webm") return "audio/webm";
  if (extension === ".ogg") return "audio/ogg";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".m4a" || extension === ".mp4") return "audio/mp4";
  return "image/jpeg";
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

/**
 * Normaliza el nombre del alumno para usarlo como directorio seguro en el filesystem.
 * Reemplaza espacios y caracteres especiales por guiones bajos.
 */
function sanitizeAlumnoName(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-zA-Z0-9_-]/g, "_") // reemplazar caracteres especiales
    .replace(/_+/g, "_")             // colapsar guiones repetidos
    .slice(0, 64);                   // límite de longitud
}

async function saveToDrive(fileName: string, bytes: Buffer, mimeType: string) {
  const relativePath = await uploadDriveEvidence({
    bytes,
    fileName,
    mimeType: mimeType.split(";")[0].trim().toLowerCase(),
  });
  return {
    relativePath,
  };
}

function getExtensionForMimeType(mimeType: string) {
  const cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  if (cleanMime === "image/png") return "png";
  if (cleanMime === "image/webp") return "webp";
  return "jpg";
}

function getExtensionForAudioMimeType(mimeType: string) {
  const cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  if (cleanMime === "audio/ogg") return "ogg";
  if (cleanMime === "audio/wav") return "wav";
  if (cleanMime === "audio/mp4") return "m4a";
  return "webm";
}

