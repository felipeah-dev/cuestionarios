"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ReporteCuestionario = {
  cuestionarioId: string;
  titulo: string;
  maxima: number;
  minima: number;
  totalIntentos: number;
};

export async function getReportsDataAction(): Promise<ReporteCuestionario[]> {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") throw new Error("No autorizado");

  const grupos = await prisma.intento.groupBy({
    by: ["cuestionarioId"],
    where: {
      estado: "CALIFICADO",
      calificacion: { not: null },
      cuestionario: { adminId: user.id },
    },
    _max: { calificacion: true },
    _min: { calificacion: true },
    _count: { id: true },
  });

  if (grupos.length === 0) return [];

  // Fetch titles in a single query — groupBy doesn't support include
  const cuestionarios = await prisma.cuestionario.findMany({
    where: { id: { in: grupos.map((g) => g.cuestionarioId) } },
    select: { id: true, titulo: true },
  });

  const titulos = new Map(cuestionarios.map((c) => [c.id, c.titulo]));

  return grupos.map((grupo) => ({
    cuestionarioId: grupo.cuestionarioId,
    titulo: titulos.get(grupo.cuestionarioId) ?? "Sin título",
    maxima: grupo._max.calificacion ?? 0,
    minima: grupo._min.calificacion ?? 0,
    totalIntentos: grupo._count.id,
  }));
}
