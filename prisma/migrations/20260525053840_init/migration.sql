-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'USUARIO');

-- CreateEnum
CREATE TYPE "TipoPregunta" AS ENUM ('OPCION_MULTIPLE', 'ABIERTA');

-- CreateEnum
CREATE TYPE "EstadoIntento" AS ENUM ('EN_PROGRESO', 'ENVIADO', 'CALIFICADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuestionario" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "adminId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuestionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" TEXT NOT NULL,
    "cuestionarioId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoPregunta" NOT NULL,
    "puntos" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opcion" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "esCorrecta" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Opcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intento" (
    "id" TEXT NOT NULL,
    "cuestionarioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "calificacion" DOUBLE PRECISION,
    "estado" "EstadoIntento" NOT NULL DEFAULT 'EN_PROGRESO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEn" TIMESTAMP(3),
    "calificadoEn" TIMESTAMP(3),

    CONSTRAINT "Intento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respuesta" (
    "id" TEXT NOT NULL,
    "intentoId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "opcionId" TEXT,
    "respuestaAbierta" TEXT,
    "puntajeObtenido" DOUBLE PRECISION,

    CONSTRAINT "Respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Respuesta_intentoId_preguntaId_key" ON "Respuesta"("intentoId", "preguntaId");

-- AddForeignKey
ALTER TABLE "Cuestionario" ADD CONSTRAINT "Cuestionario_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_cuestionarioId_fkey" FOREIGN KEY ("cuestionarioId") REFERENCES "Cuestionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opcion" ADD CONSTRAINT "Opcion_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intento" ADD CONSTRAINT "Intento_cuestionarioId_fkey" FOREIGN KEY ("cuestionarioId") REFERENCES "Cuestionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intento" ADD CONSTRAINT "Intento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "Intento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "Opcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
