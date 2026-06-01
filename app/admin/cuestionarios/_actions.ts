"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { CuestionarioInput, type CuestionarioFormValues } from "@/lib/schemas/cuestionario";

export type { CuestionarioFormValues };

// Tipos exportados para que los page components tengan inferencia correcta
export type CuestionarioListItem = {
  id: string;
  titulo: string;
  descripcion: string | null;
  adminId: string;
  creadoEn: Date;
  _count: { preguntas: number };
};

export type CuestionarioConPreguntas = {
  id: string;
  titulo: string;
  descripcion: string | null;
  adminId: string;
  creadoEn: Date;
  preguntas: Array<{
    id: string;
    cuestionarioId: string;
    texto: string;
    tipo: "OPCION_MULTIPLE" | "ABIERTA";
    puntos: number;
    orden: number;
    opciones: Array<{
      id: string;
      preguntaId: string;
      texto: string;
      esCorrecta: boolean;
    }>;
  }>;
};

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");
  if (user.rol !== "ADMIN") throw new Error("Sin permisos: se requiere rol ADMIN");
  return user;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreguntasCreate(preguntas: CuestionarioFormValues["preguntas"]) {
  return preguntas.map((p) => ({
    texto: p.texto,
    tipo: p.tipo,
    puntos: p.puntos,
    orden: p.orden,
    ...(p.tipo === "OPCION_MULTIPLE" && p.opciones?.length
      ? {
          opciones: {
            create: p.opciones.map((o) => ({ texto: o.texto, esCorrecta: o.esCorrecta })),
          },
        }
      : {}),
  }));
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function listarCuestionarios(): Promise<CuestionarioListItem[]> {
  const user = await requireAdmin();
  return prisma.cuestionario.findMany({
    where: { adminId: user.id },
    include: { _count: { select: { preguntas: true } } },
    orderBy: { creadoEn: "desc" },
  });
}

export async function getCuestionario(id: string): Promise<CuestionarioConPreguntas | null> {
  const user = await requireAdmin();
  return prisma.cuestionario.findFirst({
    where: { id, adminId: user.id },
    include: {
      preguntas: {
        orderBy: { orden: "asc" },
        include: { opciones: true },
      },
    },
  });
}

export async function crearCuestionario(raw: CuestionarioFormValues) {
  const user = await requireAdmin();
  const data = CuestionarioInput.parse(raw);

  // El create anidado es atómico en Prisma — no necesita $transaction
  const cuestionario = await prisma.cuestionario.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion,
      adminId: user.id,
      preguntas: { create: buildPreguntasCreate(data.preguntas) },
    },
  });

  revalidatePath("/admin/cuestionarios");
  return { ok: true, id: cuestionario.id };
}

export async function editarCuestionario(id: string, raw: CuestionarioFormValues) {
  const user = await requireAdmin();
  const data = CuestionarioInput.parse(raw);

  const existing = await prisma.cuestionario.findFirst({
    where: { id, adminId: user.id },
    include: { preguntas: { select: { id: true } } },
  });
  if (!existing) throw new Error("Cuestionario no encontrado o sin permisos");

  const intentoCount = await prisma.intento.count({ where: { cuestionarioId: id } });
  if (intentoCount > 0) {
    throw new Error(
      "Este cuestionario ya tiene respuestas de alumnos registradas y no puede modificarse. Si necesitas hacer cambios, crea un nuevo cuestionario."
    );
  }

  const preguntaIds: string[] = existing.preguntas.map((p: { id: string }) => p.id);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (preguntaIds.length > 0) {
      await tx.respuesta.deleteMany({ where: { preguntaId: { in: preguntaIds } } });
      await tx.opcion.deleteMany({ where: { preguntaId: { in: preguntaIds } } });
      await tx.pregunta.deleteMany({ where: { cuestionarioId: id } });
    }
    await tx.cuestionario.update({
      where: { id },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        preguntas: { create: buildPreguntasCreate(data.preguntas) },
      },
    });
  });

  revalidatePath("/admin/cuestionarios");
  revalidatePath(`/admin/cuestionarios/${id}/editar`);
  return { ok: true };
}

export async function eliminarCuestionario(id: string) {
  const user = await requireAdmin();

  const existing = await prisma.cuestionario.findFirst({
    where: { id, adminId: user.id },
    include: { preguntas: { select: { id: true } } },
  });
  if (!existing) throw new Error("Cuestionario no encontrado o sin permisos");

  const preguntaIds: string[] = existing.preguntas.map((p: { id: string }) => p.id);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (preguntaIds.length > 0) {
      await tx.respuesta.deleteMany({ where: { preguntaId: { in: preguntaIds } } });
      await tx.opcion.deleteMany({ where: { preguntaId: { in: preguntaIds } } });
      await tx.pregunta.deleteMany({ where: { cuestionarioId: id } });
    }
    await tx.intento.deleteMany({ where: { cuestionarioId: id } });
    await tx.cuestionario.delete({ where: { id } });
  });

  revalidatePath("/admin/cuestionarios");
  return { ok: true };
}
