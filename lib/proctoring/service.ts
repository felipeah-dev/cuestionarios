import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MAX_FAULTS_BEFORE_BLOCK,
  getProctoringHighConfidenceThreshold,
} from "@/lib/proctoring/config";
import { analyzeProctoringSnapshot } from "@/lib/proctoring/gemini";
import { mapAlertLevel } from "@/lib/proctoring/schema";
import { saveProctoringSnapshot } from "@/lib/proctoring/storage";
import {
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
  isActiveAttemptStatus,
} from "@/lib/quiz-rules";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ProcessSnapshotInput = {
  intentoId: string;
  usuarioId: string;
  bytes: Buffer;
  mimeType: string;
};

export type ProctoringFaultResult = {
  ok: true;
  warned: boolean;
  blocked: boolean;
  faultCount: number;
  estado: string;
  alert: {
    id: string;
    nivelAlerta: string;
    confianza: number;
    estadoRevision: string;
  } | null;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const FALLBACK_MODEL = "gemini-unavailable";

// ─── Servicio principal ───────────────────────────────────────────────────────

export async function processProctoringSnapshot({
  intentoId,
  usuarioId,
  bytes,
  mimeType,
}: ProcessSnapshotInput): Promise<ProctoringFaultResult> {
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
      usuario: { select: { nombre: true } },
      cuestionario: {
        select: {
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

  const snapshot = await saveProctoringSnapshot({
    intentoId,
    nombreAlumno: intento.usuario.nombre,
    bytes,
    mimeType,
  });

  const threshold = getProctoringHighConfidenceThreshold();
  const durationMinutes = getQuizEstimatedMinutes(intento.cuestionario.preguntas);

  let modelUsed = FALLBACK_MODEL;
  let aiResult: Prisma.InputJsonValue;
  let nivelAlerta: "BAJO" | "MEDIO" | "ALTO" = "BAJO";
  let confianza = 0;
  let estadoRevision: "PENDIENTE" | "ERROR_IA" = "PENDIENTE";
  let isHighAlert = false;

  try {
    const analysis = await analyzeProctoringSnapshot(bytes, mimeType);
    modelUsed = analysis.model;
    aiResult = analysis.result;
    nivelAlerta = mapAlertLevel(analysis.result.nivel_alerta);
    confianza = analysis.result.confianza;
    isHighAlert = nivelAlerta === "ALTO" && confianza >= threshold;
  } catch (error) {
    estadoRevision = "ERROR_IA";
    aiResult = {
      error: "gemini_analysis_failed",
      message: error instanceof Error ? error.message : "Error desconocido",
    };
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Contar faltas ALTO existentes antes de crear la nueva para decidir la acción
    const existingFaultCount = await tx.alertaProctoring.count({
      where: { intentoId, nivelAlerta: "ALTO" },
    });

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
        tipoEvidencia: "SNAPSHOT_CAMARA",
      },
      select: {
        id: true,
        nivelAlerta: true,
        confianza: true,
        estadoRevision: true,
      },
    });

    if (!isHighAlert) {
      return { alert, newFaultCount: existingFaultCount, shouldBlock: false };
    }

    const newFaultCount = existingFaultCount + 1;
    const shouldBlock = newFaultCount >= MAX_FAULTS_BEFORE_BLOCK;

    if (shouldBlock) {
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

    return { alert, newFaultCount, shouldBlock };
  });

  const blocked = result.shouldBlock;
  const warned = isHighAlert && !blocked;

  return {
    ok: true,
    warned,
    blocked,
    faultCount: result.newFaultCount,
    estado: blocked ? "PAUSADO_REVISION_IA" : intento.estado,
    alert: result.alert,
  };
}

