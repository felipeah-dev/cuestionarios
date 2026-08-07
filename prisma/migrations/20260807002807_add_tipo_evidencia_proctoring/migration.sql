-- CreateEnum
CREATE TYPE "TipoEvidenciaProctoring" AS ENUM ('SNAPSHOT_CAMARA', 'GRABACION_RUIDO');

-- AlterTable
ALTER TABLE "AlertaProctoring" ADD COLUMN     "tipoEvidencia" "TipoEvidenciaProctoring" NOT NULL DEFAULT 'SNAPSHOT_CAMARA';

-- CreateIndex
CREATE INDEX "AlertaProctoring_intentoId_nivelAlerta_idx" ON "AlertaProctoring"("intentoId", "nivelAlerta");
