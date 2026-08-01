-- CreateEnum
CREATE TYPE "NivelAlertaProctoring" AS ENUM ('BAJO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "EstadoRevisionProctoring" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'ANULADA_FALSO_POSITIVO', 'ERROR_IA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoIntento" ADD VALUE 'PAUSADO_REVISION_IA';
ALTER TYPE "EstadoIntento" ADD VALUE 'REACTIVADO_POR_ADMIN';
ALTER TYPE "EstadoIntento" ADD VALUE 'CANCELADO_CONFIRMADO';

-- AlterTable
ALTER TABLE "Intento" ADD COLUMN     "canceladoEn" TIMESTAMP(3),
ADD COLUMN     "pausadoEn" TIMESTAMP(3),
ADD COLUMN     "reactivadoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AlertaProctoring" (
    "id" TEXT NOT NULL,
    "intentoId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "snapshotPath" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "aiResultJson" JSONB NOT NULL,
    "nivelAlerta" "NivelAlertaProctoring" NOT NULL,
    "confianza" DOUBLE PRECISION NOT NULL,
    "estadoRevision" "EstadoRevisionProctoring" NOT NULL DEFAULT 'PENDIENTE',
    "revisadoPorId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertaProctoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertaProctoring_intentoId_idx" ON "AlertaProctoring"("intentoId");

-- CreateIndex
CREATE INDEX "AlertaProctoring_estudianteId_idx" ON "AlertaProctoring"("estudianteId");

-- CreateIndex
CREATE INDEX "AlertaProctoring_estadoRevision_idx" ON "AlertaProctoring"("estadoRevision");

-- CreateIndex
CREATE INDEX "AlertaProctoring_nivelAlerta_idx" ON "AlertaProctoring"("nivelAlerta");

-- AddForeignKey
ALTER TABLE "AlertaProctoring" ADD CONSTRAINT "AlertaProctoring_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "Intento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaProctoring" ADD CONSTRAINT "AlertaProctoring_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaProctoring" ADD CONSTRAINT "AlertaProctoring_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
