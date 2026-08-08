import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UploadBufferInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: "image/jpeg" | "audio/webm";
  cuestionarioTitulo: string;
  nombreAlumno: string;
  intentoNumero?: number;
  isReactivated?: boolean;
};

export type DriveUploadResult = {
  driveFileId: string;
  driveWebViewLink: string;
};

// ─── Cliente Autenticado ──────────────────────────────────────────────────────

export function getGoogleDriveClient(): drive_v3.Drive | null {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // 1. Si existe Refresh Token de OAuth2 (ideal para cuentas personales @gmail.com)
  if (refreshToken && clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // 2. Fallback a Cuenta de Servicio (ideal para Unidades Compartidas de Google Workspace)
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (clientEmail && rawPrivateKey) {
    const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    return google.drive({ version: "v3", auth });
  }

  return null;
}

// ─── Gestor de Carpetas en 4 Niveles ──────────────────────────────────────────

async function getOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentId: string
): Promise<string> {
  const escapedName = folderName.replace(/'/g, "\\'");

  // 1. Buscar si la carpeta ya existe dentro de la carpeta padre
  const searchRes = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and '${parentId}' in parents and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existingFiles = searchRes.data.files;
  if (existingFiles && existingFiles.length > 0 && existingFiles[0].id) {
    return existingFiles[0].id;
  }

  // 2. Si no existe, la crea dinámicamente
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    supportsAllDrives: true,
    fields: "id",
  });

  if (!createRes.data.id) {
    throw new Error(`No se pudo crear la carpeta '${folderName}' en Google Drive`);
  }

  return createRes.data.id;
}

// ─── Subida de Evidencia en Segundo Plano ─────────────────────────────────────

export async function uploadEvidenceBufferToDrive({
  fileBuffer,
  fileName,
  mimeType,
  cuestionarioTitulo,
  nombreAlumno,
  intentoNumero = 1,
  isReactivated = false,
}: UploadBufferInput): Promise<DriveUploadResult | null> {
  try {
    const drive = getGoogleDriveClient();
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    if (!drive || !parentFolderId) {
      // Si no están configuradas las credenciales de Drive, omitir la subida de forma silenciosa
      return null;
    }

    // 1. Resolver la jerarquía de 4 niveles: Root -> Cuestionario -> Alumno -> Intento
    const cuestionarioFolderId = await getOrCreateFolder(
      drive,
      cuestionarioTitulo,
      parentFolderId
    );

    const alumnoFolderId = await getOrCreateFolder(
      drive,
      nombreAlumno,
      cuestionarioFolderId
    );

    const intentoLabel = isReactivated
      ? `Intento ${intentoNumero} (Reactivado)`
      : `Intento ${intentoNumero}`;

    const intentoFolderId = await getOrCreateFolder(
      drive,
      intentoLabel,
      alumnoFolderId
    );

    // 2. Convertir Buffer a ReadableStream
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    // 3. Transmitir el archivo multimedia a la subcarpeta del intento
    const fileRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [intentoFolderId],
      },
      media: {
        mimeType,
        body: bufferStream,
      },
      supportsAllDrives: true,
      fields: "id, webViewLink",
    });

    const driveFileId = fileRes.data.id;
    const driveWebViewLink = fileRes.data.webViewLink;

    if (!driveFileId || !driveWebViewLink) {
      throw new Error("No se obtuvo id o webViewLink de Google Drive");
    }

    return {
      driveFileId,
      driveWebViewLink,
    };
  } catch (error) {
    console.error("Error al respaldar evidencia en Google Drive:", error);
    return null;
  }
}
