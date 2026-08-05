"use server";

import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrupoInput, type GrupoFormValues } from "@/lib/schemas/grupo";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") {
    throw new Error("No autorizado");
  }
  return user;
}

function generateJoinCode() {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]
  ).join("");
}

export async function listarGruposDelAdmin() {
  const user = await requireAdmin();

  return prisma.grupo.findMany({
    where: { adminId: user.id },
    orderBy: { creadoEn: "desc" },
    include: {
      _count: {
        select: { miembros: true, cuestionarios: true },
      },
    },
  });
}

export async function obtenerGrupoDelAdmin(id: string) {
  const user = await requireAdmin();

  return prisma.grupo.findFirst({
    where: { id, adminId: user.id },
    include: {
      miembros: {
        orderBy: { unidoEn: "desc" },
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true },
          },
        },
      },
      cuestionarios: {
        orderBy: { creadoEn: "desc" },
        include: {
          _count: { select: { preguntas: true, intentos: true } },
        },
      },
    },
  });
}

export async function crearGrupoAction(raw: GrupoFormValues) {
  const user = await requireAdmin();
  const data = GrupoInput.parse(raw);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const grupo = await prisma.grupo.create({
        data: {
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          codigo: generateJoinCode(),
          adminId: user.id,
        },
      });

      revalidatePath("/admin/grupos");
      revalidatePath("/admin/cuestionarios/nuevo");
      return { ok: true, id: grupo.id, codigo: grupo.codigo };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("No se pudo generar un codigo unico. Intenta de nuevo.");
}

export async function editarGrupoAction(id: string, raw: GrupoFormValues) {
  const user = await requireAdmin();
  const data = GrupoInput.parse(raw);

  const grupo = await prisma.grupo.findFirst({
    where: { id, adminId: user.id },
    select: { id: true },
  });
  if (!grupo) throw new Error("Grupo no encontrado o sin permisos");

  await prisma.grupo.update({
    where: { id: grupo.id },
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
    },
  });

  revalidatePath("/admin/grupos");
  revalidatePath(`/admin/grupos/${id}`);
  revalidatePath("/admin/cuestionarios");
  revalidatePath("/usuario/grupos");
  revalidatePath("/usuario/cuestionarios");

  return { ok: true };
}

export async function eliminarAlumnoDelGrupoAction(
  grupoId: string,
  usuarioId: string
) {
  const user = await requireAdmin();

  const grupo = await prisma.grupo.findFirst({
    where: { id: grupoId, adminId: user.id },
    select: { id: true },
  });
  if (!grupo) throw new Error("Grupo no encontrado o sin permisos");

  const result = await prisma.grupoMiembro.deleteMany({
    where: { grupoId: grupo.id, usuarioId },
  });
  if (result.count === 0) {
    throw new Error("El alumno ya no pertenece a este grupo");
  }

  revalidatePath("/admin/grupos");
  revalidatePath(`/admin/grupos/${grupoId}`);
  revalidatePath("/usuario/grupos");
  revalidatePath("/usuario/cuestionarios");
  revalidatePath("/usuario/dashboard");

  return { ok: true };
}
