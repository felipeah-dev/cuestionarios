import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProctoringHighConfidenceThreshold } from "@/lib/proctoring/config";
import { analyzeProctoringSnapshot } from "@/lib/proctoring/gemini";
import { mapAlertLevel } from "@/lib/proctoring/schema";
import { saveProctoringSnapshot } from "@/lib/proctoring/storage";
import {
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
  isActiveAttemptStatus,
} from "@/lib/quiz-rules";

type ProcessSnapshotInput = {
  intentoId: string;
  usuarioId: string;
  bytes: Buffer;
  mimeType: string;
};

const FALLBACK_MODEL = "gemini-unavailable";

export async function processProctoringSnapshot({
  intentoId,
  usuarioId,
  bytes,
  mimeType,
}: ProcessSnapshotInput) {
  const intento = await prisma.intento.findFirst({
    where: { id: intentoId, usuarioId },
    select: {
      id: true,
      usuarioId: true,
      estado: true,
      creadoEn: true,
      reactivadoEn: true,
      tiempoRestanteSegundos: true,
      cuestionarioId: true,
      cuestionario: {
        select: {
          preguntas: {
            select: { tipo: true },
          },
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
      paused: true,
      estado: intento.estado,
      alert: null,
    };
  }

  if (!isActiveAttemptStatus(intento.estado)) {
    throw new Error("El intento no esta activo");
  }

  const snapshot = await saveProctoringSnapshot({ intentoId, bytes, mimeType });
  const threshold = getProctoringHighConfidenceThreshold();
  const durationMinutes = getQuizEstimatedMinutes(intento.cuestionario.preguntas);

  let modelUsed = FALLBACK_MODEL;
  let aiResult: Prisma.InputJsonValue;
  let nivelAlerta: "BAJO" | "MEDIO" | "ALTO" = "BAJO";
  let confianza = 0;
  let estadoRevision: "PENDIENTE" | "ERROR_IA" = "PENDIENTE";
  let shouldPause = false;

  try {
    const analysis = await analyzeProctoringSnapshot(bytes, mimeType);
    modelUsed = analysis.model;
    aiResult = analysis.result;
    nivelAlerta = mapAlertLevel(analysis.result.nivel_alerta);
    confianza = analysis.result.confianza;
    shouldPause =
      nivelAlerta === "ALTO" &&
      confianza >= threshold &&
      analysis.result.requiere_revision_humana;
  } catch (error) {
    estadoRevision = "ERROR_IA";
    aiResult = {
      error: "gemini_analysis_failed",
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const alert = await tx.alertaProctoring.create({
      data: {
        intentoId,
        estudianteId: usuarioId,
        snapshotPath: snapshot.relativePath,
        modelUsed,
        aiResultJson: aiResult,
        nivelAlerta,
        confianza,
        estadoRevision,
      },
      select: {
        id: true,
        nivelAlerta: true,
        confianza: true,
        estadoRevision: true,
      },
    });

    if (shouldPause) {
      const remainingSeconds = getActiveAttemptRemainingSeconds(
        intento,
        durationMinutes,
        now
      );

      await tx.intento.update({
        where: { id: intentoId },
        data: {
          estado: "PAUSADO_REVISION_IA",
          pausadoEn: now,
          tiempoRestanteSegundos: remainingSeconds,
        },
      });
    }

    return alert;
  });

  return {
    ok: true,
    paused: shouldPause,
    estado: shouldPause ? "PAUSADO_REVISION_IA" : intento.estado,
    alert: result,
  };
}
