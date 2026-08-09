import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_FAULTS_BEFORE_BLOCK } from "@/lib/proctoring/config";
import { saveNoiseRecording } from "@/lib/proctoring/storage";
import { uploadEvidenceBufferToDrive } from "@/lib/proctoring/drive";
import {
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
  isActiveAttemptStatus,
} from "@/lib/quiz-rules";
import type { ProctoringFaultResult } from "@/lib/proctoring/service";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ProcessNoiseInput = {
  intentoId: string;
  usuarioId: string;
  bytes: Buffer;
  mimeType: string;
};

// ─── Servicio ─────────────────────────────────────────────────────────────────

export async function processProctoringNoise({
  intentoId,
  usuarioId,
  bytes,
  mimeType,
}: ProcessNoiseInput): Promise<ProctoringFaultResult> {
  const intento = await prisma.intento.findFirst({
    where: { id: intentoId, usuarioId },
    select: {
      id: true,
      usuarioId: true,
      cuestionarioId: true,
      estado: true,
      creadoEn: true,
      reactivadoEn: true,
      tiempoRestanteSegundos: true,
      usuario: { select: { nombre: true } },
      cuestionario: {
        select: {
          titulo: true,
          preguntas: { select: { tipo: true } },
        },
      },
    },
  });

  if (!intento) {
    throw new Error("Intento no encontrado");
  }

  if (intento.estado === "PAUSADO_REVISION_IA") {
    return {
      ok: true,
      warned: false,
      blocked: true,
      faultCount: MAX_FAULTS_BEFORE_BLOCK,
      estado: intento.estado,
      alert: null,
    };
  }

  if (!isActiveAttemptStatus(intento.estado)) {
    throw new Error("El intento no esta activo");
  }

  const recording = await saveNoiseRecording({
    intentoId,
    nombreAlumno: intento.usuario.nombre,
    bytes,
    mimeType,
  });

  const DEFAULT_NOISE_DESCRIPTION =
    "Se detectó ruido excesivo o habla continua en el micrófono (+15 dB sobre el nivel base de silencio).";

  const aiResultJson: Prisma.InputJsonValue = {
    detection_method: "web_audio_api_rms",
    noise_above_baseline: true,
    sustained_seconds: 3,
    agc_disabled: true,
    descripcion_breve: DEFAULT_NOISE_DESCRIPTION,
  };

  const result = await prisma.$transaction(async (tx) => {
    // Contar faltas ALTO existentes producidas en el periodo activo actual (tras reactivación si la hubo)
    const faultWhere: Prisma.AlertaProctoringWhereInput = {
      intentoId,
      nivelAlerta: "ALTO",
    };
    if (intento.reactivadoEn) {
      faultWhere.creadoEn = { gte: intento.reactivadoEn };
    }

    const existingFaultCount = await tx.alertaProctoring.count({
      where: faultWhere,
    });

    const alert = await tx.alertaProctoring.create({
      data: {
        intentoId,
        estudianteId: usuarioId,
        snapshotPath: recording.relativePath,
        modelUsed: "noise-detector-client-rms",
        aiResultJson,
        nivelAlerta: "ALTO",
        confianza: 1.0,
        estadoRevision: "PENDIENTE",
        tipoEvidencia: "GRABACION_RUIDO",
      },
      select: {
        id: true,
        nivelAlerta: true,
        confianza: true,
        estadoRevision: true,
      },
    });

    const newFaultCount = existingFaultCount + 1;
    const shouldBlock = newFaultCount >= MAX_FAULTS_BEFORE_BLOCK;

    if (shouldBlock) {
      const now = new Date();
      const durationMinutes = getQuizEstimatedMinutes(intento.cuestionario.preguntas);
      const remainingSeconds = getActiveAttemptRemainingSeconds(intento, durationMinutes, now);

      await tx.intento.update({
        where: { id: intentoId },
        data: {
          estado: "PAUSADO_REVISION_IA",
          pausadoEn: now,
          tiempoRestanteSegundos: remainingSeconds,
        },
      });
    }

    return { alert, newFaultCount, shouldBlock };
  });

  if (result.alert) {
    const alertId = result.alert.id;
    const now = new Date();

    // Determinar el número de intento correlativo del alumno en este cuestionario
    const attemptCount = await prisma.intento.count({
      where: {
        usuarioId: intento.usuarioId,
        cuestionarioId: intento.cuestionarioId,
        creadoEn: { lte: intento.creadoEn },
      },
    });

    const isReactivated = Boolean(intento.reactivadoEn && now >= intento.reactivadoEn);

    // Contar cuántas reactivaciones ha tenido (fronteras distintas de revisadoEn en alertas anuladas)
    const reactivationBoundaries = await prisma.alertaProctoring.findMany({
      where: {
        intentoId: intento.id,
        estadoRevision: "ANULADA_FALSO_POSITIVO",
        revisadoEn: { not: null },
      },
      select: { revisadoEn: true },
      distinct: ["revisadoEn"],
    });
    const reactivationCount = reactivationBoundaries.length;

    void uploadEvidenceBufferToDrive({
      fileBuffer: bytes,
      fileName: `ruido-${now.toISOString().replace(/[:.]/g, "-")}.webm`,
      mimeType: "audio/webm",
      cuestionarioTitulo: intento.cuestionario.titulo,
      nombreAlumno: intento.usuario.nombre,
      intentoNumero: attemptCount,
      isReactivated,
      reactivationCount,
    }).then(async (driveResult) => {
      if (driveResult) {
        await prisma.alertaProctoring.update({
          where: { id: alertId },
          data: {
            driveFileId: driveResult.driveFileId,
            driveWebViewLink: driveResult.driveWebViewLink,
          },
        });
      }
    });
  }

  const blocked = result.shouldBlock;

  return {
    ok: true,
    warned: !blocked,
    blocked,
    faultCount: result.newFaultCount,
    estado: blocked ? "PAUSADO_REVISION_IA" : intento.estado,
    descripcion: "Ruido ambiental excesivo sostenido por 3 segundos continuos (+15 dB sobre el nivel base de silencio).",
    alert: result.alert,
  };
}
