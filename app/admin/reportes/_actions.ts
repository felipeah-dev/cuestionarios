"use server";

import { prisma } from "@/lib/prisma";

export type ReporteCuestionario = {
  cuestionarioId: string;
  titulo: string;
  maxima: number;
  minima: number;
  totalIntentos: number;
};

export async function getReportsDataAction(): Promise<ReporteCuestionario[]> {
  const intentos = await prisma.intento.findMany({
    where: { estado: "CALIFICADO" },
    select: {
      cuestionarioId: true,
      calificacion: true,
      cuestionario: {
        select: { titulo: true },
      },
    },
  });

  const grouped = new Map<string, { titulo: string; calificaciones: number[] }>();

  for (const intento of intentos) {
    if (intento.calificacion === null) continue;

    if (!grouped.has(intento.cuestionarioId)) {
      grouped.set(intento.cuestionarioId, {
        titulo: intento.cuestionario.titulo,
        calificaciones: [],
      });
    }

    grouped.get(intento.cuestionarioId)!.calificaciones.push(intento.calificacion);
  }

  return Array.from(grouped.entries()).map(([cuestionarioId, data]) => ({
    cuestionarioId,
    titulo: data.titulo,
    maxima: Math.max(...data.calificaciones),
    minima: Math.min(...data.calificaciones),
    totalIntentos: data.calificaciones.length,
  }));
}
