"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { finalizeQuizAttemptForUser } from "@/lib/quiz-finalization";
import { prisma } from "@/lib/prisma";
import {
  getAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
} from "@/lib/quiz-rules";

export async function saveAnswerAction(
  intentoId: string,
  preguntaId: string,
  data: { opcionId?: string | null; respuestaAbierta?: string | null }
) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      usuarioId: user.id,
      estado: "EN_PROGRESO",
      cuestionario: {
        preguntas: {
          some: { id: preguntaId },
        },
      },
    },
    include: {
      cuestionario: {
        include: {
          preguntas: {
            select: { tipo: true },
          },
        },
      },
    },
  });

  if (!intento) {
    throw new Error("Intento no encontrado o ya finalizado");
  }

  const remainingSeconds = getAttemptRemainingSeconds(
    intento.creadoEn,
    getQuizEstimatedMinutes(intento.cuestionario.preguntas)
  );

  if (remainingSeconds <= 0) {
    await finalizeQuizAttemptForUser({
      intentoId,
      usuarioId: user.id,
    });

    revalidatePath("/usuario/cuestionarios");
    revalidatePath(`/usuario/cuestionarios/${intento.cuestionarioId}/resultado`);

    throw new Error("El tiempo del examen ya termino");
  }

  await prisma.respuesta.upsert({
    where: {
      intentoId_preguntaId: {
        intentoId,
        preguntaId,
      },
    },
    update: {
      opcionId: data.opcionId ?? null,
      respuestaAbierta: data.respuestaAbierta ?? null,
    },
    create: {
      intentoId,
      preguntaId,
      opcionId: data.opcionId ?? null,
      respuestaAbierta: data.respuestaAbierta ?? null,
    },
  });

  return { success: true };
}

export async function startQuizAttemptAction(cuestionarioId: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  const cuestionario = await prisma.cuestionario.findUnique({
    where: { id: cuestionarioId },
    include: {
      preguntas: {
        select: { tipo: true },
      },
    },
  });

  if (!cuestionario) {
    throw new Error("Cuestionario no encontrado");
  }

  const latestAttempt = await prisma.intento.findFirst({
    where: {
      cuestionarioId,
      usuarioId: user.id,
    },
    orderBy: { creadoEn: "desc" },
    include: { respuestas: true },
  });

  if (latestAttempt?.estado === "ENVIADO" || latestAttempt?.estado === "CALIFICADO") {
    throw new Error("Este cuestionario ya fue enviado");
  }

  if (latestAttempt?.estado === "EN_PROGRESO") {
    const remainingSeconds = getAttemptRemainingSeconds(
      latestAttempt.creadoEn,
      getQuizEstimatedMinutes(cuestionario.preguntas)
    );

    if (remainingSeconds <= 0) {
      const result = await finalizeQuizAttemptForUser({
        intentoId: latestAttempt.id,
        usuarioId: user.id,
      });

      revalidatePath("/usuario/cuestionarios");
      revalidatePath(`/usuario/cuestionarios/${result.cuestionarioId}/resultado`);

      throw new Error("El tiempo del examen ya termino");
    }

    return latestAttempt;
  }

  return prisma.intento.create({
    data: {
      cuestionarioId,
      usuarioId: user.id,
      estado: "EN_PROGRESO",
    },
    include: { respuestas: true },
  });
}

export async function submitQuizAction(intentoId: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  const result = await finalizeQuizAttemptForUser({
    intentoId,
    usuarioId: user.id,
  });

  revalidatePath("/usuario/cuestionarios");
  revalidatePath(`/usuario/cuestionarios/${result.cuestionarioId}/resultado`);

  redirect(`/usuario/cuestionarios/${result.cuestionarioId}/resultado`);
}

export async function finishQuizAttemptAction(intentoId: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  const result = await finalizeQuizAttemptForUser({
    intentoId,
    usuarioId: user.id,
  });

  revalidatePath("/usuario/cuestionarios");
  revalidatePath(`/usuario/cuestionarios/${result.cuestionarioId}/resultado`);

  return {
    ok: true,
    redirectTo: `/usuario/cuestionarios/${result.cuestionarioId}/resultado`,
  };
}
