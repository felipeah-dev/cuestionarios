"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CodigoGrupoInput } from "@/lib/schemas/grupo";

export async function unirseAGrupoAction(rawCode: string) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    throw new Error("No autorizado");
  }

  const parsedCode = CodigoGrupoInput.safeParse(rawCode);
  if (!parsedCode.success) {
    throw new Error(parsedCode.error.issues[0]?.message ?? "Codigo invalido");
  }
  const codigo = parsedCode.data;
  const grupo = await prisma.grupo.findUnique({
    where: { codigo },
    select: { id: true, nombre: true },
  });

  if (!grupo) {
    throw new Error("No encontramos un grupo con ese codigo");
  }

  const existing = await prisma.grupoMiembro.findUnique({
    where: {
      grupoId_usuarioId: {
        grupoId: grupo.id,
        usuarioId: user.id,
      },
    },
  });

  if (existing) {
    return { ok: true, message: `Ya perteneces a ${grupo.nombre}` };
  }

  await prisma.grupoMiembro.create({
    data: {
      grupoId: grupo.id,
      usuarioId: user.id,
    },
  });

  revalidatePath("/usuario/grupos");
  revalidatePath("/usuario/cuestionarios");
  revalidatePath("/usuario/dashboard");

  return { ok: true, message: `Te uniste a ${grupo.nombre}` };
}
