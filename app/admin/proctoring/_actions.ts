"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
} from "@/lib/quiz-rules";

async function requireAdminAttempt(intentoId: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") {
    throw new Error("No autorizado");
  }

  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      cuestionario: {
        adminId: user.id,
      },
    },
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
  });

  if (!intento) {
    throw new Error("Intento no encontrado o sin permisos");
  }

  return { user, intento };
}

export async function confirmarIntentoIrregularidadAction(intentoId: string) {
  const { user, intento } = await requireAdminAttempt(intentoId);
  const now = new Date();

  await prisma.$transaction([
    prisma.alertaProctoring.updateMany({
      where: { intentoId: intento.id },
      data: {
        estadoRevision: "CONFIRMADA",
        revisadoPorId: user.id,
        revisadoEn: now,
      },
    }),
    prisma.intento.update({
      where: { id: intento.id },
      data: {
        estado: "CANCELADO_CONFIRMADO",
        canceladoEn: now,
      },
    }),
  ]);

  revalidatePath("/admin/proctoring");
  revalidatePath(`/admin/proctoring/${intento.cuestionarioId}`);
  revalidatePath(`/admin/proctoring/${intento.cuestionarioId}/${intento.id}`);
  revalidatePath(`/admin/cuestionarios/${intento.cuestionarioId}/intentos`);
  revalidatePath("/usuario/cuestionarios");

  return { ok: true };
}

export async function reactivarIntentoFalsoPositivoAction(intentoId: string) {
  const { user, intento } = await requireAdminAttempt(intentoId);
  const now = new Date();
  const durationMinutes = getQuizEstimatedMinutes(
    intento.cuestionario.preguntas
  );
  const fallbackEstado = intento.reactivadoEn
    ? "REACTIVADO_POR_ADMIN"
    : "EN_PROGRESO";
  const tiempoRestanteSegundos =
    intento.tiempoRestanteSegundos ??
    getActiveAttemptRemainingSeconds(
      {
        ...intento,
        estado: fallbackEstado,
      },
      durationMinutes,
      intento.pausadoEn ?? now
    );

  await prisma.$transaction([
    prisma.alertaProctoring.updateMany({
      where: { intentoId: intento.id },
      data: {
        estadoRevision: "ANULADA_FALSO_POSITIVO",
        revisadoPorId: user.id,
        revisadoEn: now,
      },
    }),
    prisma.intento.update({
      where: { id: intento.id },
      data: {
        estado: "REACTIVADO_POR_ADMIN",
        reactivadoEn: now,
        pausadoEn: null,
        tiempoRestanteSegundos,
      },
    }),
  ]);

  revalidatePath("/admin/proctoring");
  revalidatePath(`/admin/proctoring/${intento.cuestionarioId}`);
  revalidatePath(`/admin/proctoring/${intento.cuestionarioId}/${intento.id}`);
  revalidatePath(`/admin/cuestionarios/${intento.cuestionarioId}/intentos`);
  revalidatePath("/usuario/cuestionarios");

  return { ok: true };
}
