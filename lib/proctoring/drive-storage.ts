import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_REFERENCE_PREFIX = "gdrive:";

let driveClient: drive_v3.Drive | null = null;

type UploadDriveEvidenceInput = {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
};

export async function uploadDriveEvidence({
  bytes,
  fileName,
  mimeType,
}: UploadDriveEvidenceInput) {
  const folderId = requireEnv("GOOGLE_DRIVE_FOLDER_ID");
  const drive = getDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from([bytes]),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!response.data.id) {
    throw new Error("Google Drive no devolvio el identificador de la evidencia");
  }

  return `${DRIVE_REFERENCE_PREFIX}${response.data.id}`;
}

export async function readDriveEvidence(reference: string) {
  const fileId = getDriveFileId(reference);
  const drive = getDriveClient();
  const metadata = await drive.files.get({
    fileId,
    fields: "id,mimeType",
    supportsAllDrives: true,
  });
  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    { responseType: "arraybuffer" }
  );

  return {
    bytes: Buffer.from(response.data as ArrayBuffer),
    mimeType: metadata.data.mimeType || "application/octet-stream",
  };
}

export function isDriveEvidenceReference(reference: string) {
  return reference.startsWith(DRIVE_REFERENCE_PREFIX);
}

function getDriveClient() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim();
  const serviceAccountKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (clientId && clientSecret && refreshToken) {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    driveClient = google.drive({ version: "v3", auth });
    return driveClient;
  }

  if (serviceAccountEmail && serviceAccountKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountKey.replace(/\\n/g, "\n"),
      },
      scopes: [DRIVE_SCOPE],
    });
    driveClient = google.drive({ version: "v3", auth });
    return driveClient;
  }

  throw new Error(
    "Google Drive no esta configurado. Define credenciales OAuth o de cuenta de servicio."
  );
}

function getDriveFileId(reference: string) {
  if (!isDriveEvidenceReference(reference)) {
    throw new Error("La referencia no pertenece a Google Drive");
  }

  const fileId = reference.slice(DRIVE_REFERENCE_PREFIX.length);
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    throw new Error("Identificador de Google Drive invalido");
  }

  return fileId;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
}
