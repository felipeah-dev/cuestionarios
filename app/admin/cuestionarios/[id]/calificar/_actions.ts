"use server";

import { EstadoIntento, TipoPregunta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type GradeOpenQuestionResult =
  | { ok: true; intentoCalificado: boolean }
  | { ok: false; error: string };

export async function gradeOpenQuestionAction(
  respuestaId: string,
  score: number
): Promise<GradeOpenQuestionResult> {
  const user = await getCurrentUser();

  if (!user || user.rol !== "ADMIN") {
    return { ok: false, error: "No tienes permiso para calificar respuestas." };
  }

  if (!respuestaId) {
    return { ok: false, error: "No se encontro la respuesta a calificar." };
  }

  if (!Number.isFinite(score)) {
    return { ok: false, error: "El puntaje debe ser un numero valido." };
  }

  let intentoIdToRevalidate: string | null = null;

  const result: GradeOpenQuestionResult = await prisma.$transaction(
    async (tx): Promise<GradeOpenQuestionResult> => {
      const respuesta = await tx.respuesta.findUnique({
        where: { id: respuestaId },
        include: {
          intento: {
            select: {
              id: true,
              estado: true,
              cuestionarioId: true,
            },
          },
          pregunta: {
            select: {
              puntos: true,
              tipo: true,
            },
          },
        },
      });

      if (!respuesta) {
        return { ok: false, error: "No se encontro la respuesta a calificar." };
      }

      const cuestionario = await tx.cuestionario.findFirst({
        where: { id: respuesta.intento.cuestionarioId, adminId: user.id },
      });
      if (!cuestionario) {
        return { ok: false, error: "Sin permisos para calificar este intento." };
      }

      if (respuesta.pregunta.tipo !== TipoPregunta.ABIERTA) {
        return {
          ok: false,
          error: "Solo se califican manualmente respuestas abiertas.",
        };
      }

      if (respuesta.intento.estado === EstadoIntento.EN_PROGRESO) {
        return { ok: false, error: "El intento aun no ha sido enviado." };
      }

      if (score < 0 || score > respuesta.pregunta.puntos) {
        return {
          ok: false,
          error: `El puntaje debe estar entre 0 y ${respuesta.pregunta.puntos}.`,
        };
      }

      await tx.respuesta.update({
        where: { id: respuestaId },
        data: { puntajeObtenido: score },
      });

      const respuestas = await tx.respuesta.findMany({
        where: { intentoId: respuesta.intento.id },
        select: {
          puntajeObtenido: true,
          pregunta: {
            select: {
              puntos: true,
            },
          },
        },
      });

      const todasCalificadas = respuestas.every(
        (item) => item.puntajeObtenido !== null
      );

      if (todasCalificadas) {
        const puntosObtenidos = respuestas.reduce(
          (total, item) => total + (item.puntajeObtenido ?? 0),
          0
        );
        const puntosMaximos = respuestas.reduce(
          (total, item) => total + item.pregunta.puntos,
          0
        );
        const calificacion =
          puntosMaximos > 0 ? (puntosObtenidos / puntosMaximos) * 100 : 0;

        await tx.intento.update({
          where: { id: respuesta.intento.id },
          data: {
            calificacion,
            calificadoEn: new Date(),
            estado: EstadoIntento.CALIFICADO,
          },
        });
      }

      intentoIdToRevalidate = respuesta.intento.id;

      return { ok: true, intentoCalificado: todasCalificadas };
    }
  );

  if (result.ok && intentoIdToRevalidate) {
    revalidatePath(`/admin/cuestionarios/${intentoIdToRevalidate}/calificar`);
  }

  return result;
}
