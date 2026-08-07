import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_FAULTS_BEFORE_BLOCK } from "@/lib/proctoring/config";
import { saveNoiseRecording } from "@/lib/proctoring/storage";
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
      estado: true,
      creadoEn: true,
      reactivadoEn: true,
      tiempoRestanteSegundos: true,
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

  const recording = await saveNoiseRecording({
    intentoId,
    nombreAlumno: intento.usuario.nombre,
    bytes,
    mimeType,
  });

  const aiResultJson: Prisma.InputJsonValue = {
    detection_method: "web_audio_api_rms",
    noise_above_baseline: true,
    sustained_seconds: 3,
    agc_disabled: true,
  };

  const result = await prisma.$transaction(async (tx) => {
    // Contar faltas ALTO existentes antes de crear la nueva
    const existingFaultCount = await tx.alertaProctoring.count({
      where: { intentoId, nivelAlerta: "ALTO" },
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

  const blocked = result.shouldBlock;

  return {
    ok: true,
    warned: !blocked,
    blocked,
    faultCount: result.newFaultCount,
    estado: blocked ? "PAUSADO_REVISION_IA" : intento.estado,
    alert: result.alert,
  };
}
