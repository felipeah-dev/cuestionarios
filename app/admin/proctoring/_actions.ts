"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
} from "@/lib/quiz-rules";

async function requireAdminAlert(alertId: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") {
    throw new Error("No autorizado");
  }

  const alert = await prisma.alertaProctoring.findFirst({
    where: {
      id: alertId,
      intento: {
        cuestionario: {
          adminId: user.id,
        },
      },
    },
    select: {
      id: true,
      intentoId: true,
      intento: {
        select: {
          id: true,
          cuestionarioId: true,
          estado: true,
          creadoEn: true,
          pausadoEn: true,
          reactivadoEn: true,
          tiempoRestanteSegundos: true,
          cuestionario: {
            select: {
              preguntas: {
                select: { tipo: true },
              },
            },
          },
        },
      },
    },
  });

  if (!alert) {
    throw new Error("Alerta no encontrada o sin permisos");
  }

  return { user, alert };
}

export async function confirmarAlertaProctoringAction(alertId: string) {
  const { user, alert } = await requireAdminAlert(alertId);
  const now = new Date();

  await prisma.$transaction([
    prisma.alertaProctoring.update({
      where: { id: alert.id },
      data: {
        estadoRevision: "CONFIRMADA",
        revisadoPorId: user.id,
        revisadoEn: now,
      },
    }),
    prisma.intento.update({
      where: { id: alert.intentoId },
      data: {
        estado: "CANCELADO_CONFIRMADO",
        canceladoEn: now,
      },
    }),
  ]);

  revalidatePath("/admin/proctoring");
  revalidatePath(`/admin/cuestionarios/${alert.intento.cuestionarioId}/intentos`);
  revalidatePath("/usuario/cuestionarios");

  return { ok: true };
}

export async function anularAlertaProctoringAction(alertId: string) {
  const { user, alert } = await requireAdminAlert(alertId);
  const now = new Date();
  const durationMinutes = getQuizEstimatedMinutes(
    alert.intento.cuestionario.preguntas
  );
  const fallbackEstado = alert.intento.reactivadoEn
    ? "REACTIVADO_POR_ADMIN"
    : "EN_PROGRESO";
  const tiempoRestanteSegundos =
    alert.intento.tiempoRestanteSegundos ??
    getActiveAttemptRemainingSeconds(
      {
        ...alert.intento,
        estado: fallbackEstado,
      },
      durationMinutes,
      alert.intento.pausadoEn ?? now
    );

  await prisma.$transaction([
    prisma.alertaProctoring.update({
      where: { id: alert.id },
      data: {
        estadoRevision: "ANULADA_FALSO_POSITIVO",
        revisadoPorId: user.id,
        revisadoEn: now,
      },
    }),
    prisma.intento.update({
      where: { id: alert.intentoId },
      data: {
        estado: "REACTIVADO_POR_ADMIN",
        reactivadoEn: now,
        pausadoEn: null,
        tiempoRestanteSegundos,
      },
    }),
  ]);

  revalidatePath("/admin/proctoring");
  revalidatePath(`/admin/cuestionarios/${alert.intento.cuestionarioId}/intentos`);
  revalidatePath("/usuario/cuestionarios");

  return { ok: true };
}
