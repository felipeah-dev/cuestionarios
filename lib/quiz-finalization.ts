import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateFinalPercentage } from "@/lib/quiz-rules";

type FinalizeQuizAttemptInput = {
  intentoId: string;
  usuarioId: string;
};

export async function finalizeQuizAttemptForUser({
  intentoId,
  usuarioId,
}: FinalizeQuizAttemptInput) {
  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      usuarioId,
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
    throw new Error("Intento no encontrado");
  }

  if (intento.estado !== "EN_PROGRESO") {
    return {
      cuestionarioId: intento.cuestionarioId,
      estado: intento.estado,
      calificacion: intento.calificacion,
      alreadyFinalized: true,
    };
  }

  const preguntas = intento.cuestionario.preguntas;
  const respuestas = intento.respuestas;

  let contienePreguntasAbiertas = false;
  let puntosObtenidos = 0;
  let puntosTotales = 0;
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
      puntosObtenidos += Math.min(puntaje, pregunta.puntos);

      if (respuesta) {
        operaciones.push(
          prisma.respuesta.update({
            where: { id: respuesta.id },
            data: { puntajeObtenido: puntaje },
          })
        );
      } else {
        operaciones.push(
          prisma.respuesta.create({
            data: {
              intentoId,
              preguntaId: pregunta.id,
              opcionId: null,
              respuestaAbierta: null,
              puntajeObtenido: puntaje,
            },
          })
        );
      }
    } else if (pregunta.tipo === "ABIERTA") {
      contienePreguntasAbiertas = true;

      if (respuesta) {
        operaciones.push(
          prisma.respuesta.update({
            where: { id: respuesta.id },
            data: { puntajeObtenido: null },
          })
        );
      } else {
        operaciones.push(
          prisma.respuesta.create({
            data: {
              intentoId,
              preguntaId: pregunta.id,
              opcionId: null,
              respuestaAbierta: null,
              puntajeObtenido: null,
            },
          })
        );
      }
    }
  }

  if (operaciones.length > 0) {
    await prisma.$transaction(operaciones);
  }

  const enviadoEn = new Date();
  const estadoFinal = contienePreguntasAbiertas ? "ENVIADO" : "CALIFICADO";
  const calificacionFinal = contienePreguntasAbiertas
    ? null
    : calculateFinalPercentage(puntosObtenidos, puntosTotales);
  const calificadoEn = contienePreguntasAbiertas ? null : enviadoEn;

  await prisma.intento.update({
    where: { id: intentoId },
    data: {
      estado: estadoFinal,
      enviadoEn,
      calificadoEn,
      calificacion: calificacionFinal,
    },
  });

  return {
    cuestionarioId: intento.cuestionarioId,
    estado: estadoFinal,
    calificacion: calificacionFinal,
    alreadyFinalized: false,
  };
}
