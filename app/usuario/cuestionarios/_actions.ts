"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

/**
 * Saves or updates a single question response in the database.
 * This is invoked dynamically in the background for real-time progress persistence.
 */
export async function saveAnswerAction(
  intentoId: string,
  preguntaId: string,
  data: { opcionId?: string | null; respuestaAbierta?: string | null }
) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  // Verify the attempt exists, belongs to the current user, and is in progress
  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      usuarioId: user.id,
      estado: "EN_PROGRESO",
    },
  });

  if (!intento) {
    throw new Error("Intento no encontrado o ya finalizado");
  }

  // Use upsert to safely create or update the answer for this unique attempt-question pair
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

/**
 * Submits the questionnaire, grades all multiple choice questions,
 * and sets the final attempt status to ENVIADO (or CALIFICADO if no open questions).
 */
export async function submitQuizAction(intentoId: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      usuarioId: user.id,
      estado: "EN_PROGRESO",
    },
    include: {
      cuestionario: {
        include: {
          preguntas: {
            include: {
              opciones: true,
            },
          },
        },
      },
      respuestas: true,
    },
  });

  if (!intento) {
    throw new Error("Intento no encontrado o ya finalizado");
  }

  const preguntas = intento.cuestionario.preguntas;
  const respuestas = intento.respuestas;

  let contienePreguntasAbiertas = false;
  let puntosObtenidos = 0;
  let puntosTotales = 0;

  // Grade each answer — build all write operations first, then run in one transaction
  const operaciones: Prisma.PrismaPromise<unknown>[] = [];

  for (const pregunta of preguntas) {
    puntosTotales += pregunta.puntos;
    const respuesta = respuestas.find((r) => r.preguntaId === pregunta.id);

    if (pregunta.tipo === "OPCION_MULTIPLE") {
      const opcionCorrecta = pregunta.opciones.find((o) => o.esCorrecta);
      const seleccionadaId = respuesta?.opcionId;
      const esCorrecta =
        seleccionadaId && opcionCorrecta && seleccionadaId === opcionCorrecta.id;
      const puntaje = esCorrecta ? pregunta.puntos : 0;
      puntosObtenidos += puntaje;

      if (respuesta) {
        operaciones.push(
          prisma.respuesta.update({ where: { id: respuesta.id }, data: { puntajeObtenido: puntaje } })
        );
      } else {
        operaciones.push(
          prisma.respuesta.create({
            data: { intentoId, preguntaId: pregunta.id, opcionId: null, respuestaAbierta: null, puntajeObtenido: puntaje },
          })
        );
      }
    } else if (pregunta.tipo === "ABIERTA") {
      contienePreguntasAbiertas = true;

      if (respuesta) {
        operaciones.push(
          prisma.respuesta.update({ where: { id: respuesta.id }, data: { puntajeObtenido: null } })
        );
      } else {
        operaciones.push(
          prisma.respuesta.create({
            data: { intentoId, preguntaId: pregunta.id, opcionId: null, respuestaAbierta: null, puntajeObtenido: null },
          })
        );
      }
    }
  }

  if (operaciones.length > 0) await prisma.$transaction(operaciones);

  const enviadoEn = new Date();
  let estadoFinal: "ENVIADO" | "CALIFICADO" = "ENVIADO";
  let calificacionFinal: number | null = null;
  let calificadoEn: Date | null = null;

  // If the questionnaire only has multiple choice questions, mark as CALIFICADO instantly
  if (!contienePreguntasAbiertas) {
    estadoFinal = "CALIFICADO";
    calificacionFinal = puntosTotales > 0 ? (puntosObtenidos / puntosTotales) * 100 : 100;
    calificadoEn = enviadoEn;
  }

  // Update the quiz attempt
  await prisma.intento.update({
    where: { id: intentoId },
    data: {
      estado: estadoFinal,
      enviadoEn,
      calificadoEn,
      calificacion: calificacionFinal,
    },
  });

  // Revalidate paths to reflect immediate state changes
  revalidatePath("/usuario/cuestionarios");
  revalidatePath(`/usuario/cuestionarios/${intento.cuestionarioId}/resultado`);

  // Redirect the user to the result page
  redirect(`/usuario/cuestionarios/${intento.cuestionarioId}/resultado`);
}

