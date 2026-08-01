import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ALLOWED_SNAPSHOT_MIME_TYPES,
  MAX_SNAPSHOT_BYTES,
  PROCTORING_STORAGE_ROOT,
} from "@/lib/proctoring/config";

type SaveSnapshotInput = {
  intentoId: string;
  bytes: Buffer;
  mimeType: string;
};

export function assertValidSnapshot(bytes: Buffer, mimeType: string) {
  if (!ALLOWED_SNAPSHOT_MIME_TYPES.includes(mimeType as never)) {
    throw new Error("Tipo de imagen no permitido");
  }

  if (bytes.byteLength === 0) {
    throw new Error("La imagen esta vacia");
  }

  if (bytes.byteLength > MAX_SNAPSHOT_BYTES) {
    throw new Error("La imagen excede el tamano maximo permitido");
  }
}

export async function saveProctoringSnapshot({
  intentoId,
  bytes,
  mimeType,
}: SaveSnapshotInput) {
  assertValidSnapshot(bytes, mimeType);

  const extension = getExtensionForMimeType(mimeType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relativePath = path.join(intentoId, `${timestamp}.${extension}`);
  const absoluteDirectory = path.resolve(PROCTORING_STORAGE_ROOT, intentoId);
  const absolutePath = path.resolve(PROCTORING_STORAGE_ROOT, relativePath);

  const storageRoot = path.resolve(PROCTORING_STORAGE_ROOT);
  if (!absolutePath.startsWith(storageRoot)) {
    throw new Error("Ruta de evidencia invalida");
  }

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absolutePath, bytes);

  return {
    relativePath: relativePath.replace(/\\/g, "/"),
    absolutePath,
  };
}

export async function readProctoringSnapshot(relativePath: string) {
  const storageRoot = path.resolve(PROCTORING_STORAGE_ROOT);
  const absolutePath = path.resolve(PROCTORING_STORAGE_ROOT, relativePath);

  if (!absolutePath.startsWith(storageRoot)) {
    throw new Error("Ruta de evidencia invalida");
  }

  return readFile(absolutePath);
}

export function getSnapshotMimeTypeFromPath(snapshotPath: string) {
  const extension = path.extname(snapshotPath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function getExtensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}
