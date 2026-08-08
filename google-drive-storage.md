# Evidencias de proctoring en Google Drive

Las nuevas capturas de camara y grabaciones de audio se guardan en una carpeta
privada de Google Drive. La base de datos conserva una referencia con el formato
`gdrive:<fileId>` y los archivos se muestran al administrador mediante la ruta
protegida de la aplicacion. No es necesario hacer publica la carpeta.

Las evidencias locales creadas antes de este cambio siguen siendo legibles desde
`storage/proctoring`, pero la aplicacion ya no escribe archivos nuevos ahi.

## Configuracion recomendada para una cuenta personal

1. Crea o selecciona un proyecto en Google Cloud Console.
2. Habilita Google Drive API para ese proyecto.
3. Configura la pantalla de consentimiento OAuth y agrega tu cuenta como usuario
   de prueba si la aplicacion permanece en modo de prueba.
4. Crea credenciales OAuth 2.0 y agrega
   `https://developers.google.com/oauthplayground` como URI de redireccion.
5. En OAuth 2.0 Playground, abre la configuracion, activa "Use your own OAuth
   credentials" y escribe el client ID y client secret anteriores.
6. Autoriza el scope `https://www.googleapis.com/auth/drive`, intercambia el
   codigo y copia el refresh token.
7. Crea una carpeta privada en Drive y copia su ID desde una URL como
   `https://drive.google.com/drive/folders/ID_DE_LA_CARPETA`.
8. Agrega al `.env`:

```env
GOOGLE_DRIVE_FOLDER_ID="ID_DE_LA_CARPETA"
GOOGLE_DRIVE_CLIENT_ID="CLIENT_ID.apps.googleusercontent.com"
GOOGLE_DRIVE_CLIENT_SECRET="CLIENT_SECRET"
GOOGLE_DRIVE_REFRESH_TOKEN="REFRESH_TOKEN"
```

Reinicia `pnpm dev` despues de cambiar el `.env`.

## Alternativa con cuenta de servicio

Para Google Workspace o un Shared Drive se puede utilizar una cuenta de servicio.
La cuenta debe tener permiso de editor en la carpeta configurada:

```env
GOOGLE_DRIVE_FOLDER_ID="ID_DE_LA_CARPETA_O_SHARED_DRIVE"
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL="cuenta@proyecto.iam.gserviceaccount.com"
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Una cuenta de servicio normalmente no tiene cuota propia para almacenar archivos
en "Mi unidad". Para una cuenta personal utiliza OAuth; para una organizacion,
utiliza un Shared Drive o delegacion administrada por Google Workspace.

## Seguridad

- Nunca subas `.env`, el refresh token ni la llave privada al repositorio.
- No hagas publica la carpeta de evidencias.
- Solo los administradores autenticados pueden descargar archivos mediante la
  aplicacion.
- Revoca las credenciales desde Google Cloud si sospechas que fueron expuestas.
