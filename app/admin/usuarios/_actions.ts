"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod/v3";
import bcrypt from "bcryptjs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UsuarioListItem = {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "USUARIO";
  creadoEn: Date;
  _count: { intentos: number };
};

const CrearUsuarioInput = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  email: z
    .string()
    .regex(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      "Correo inválido"
    ),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un símbolo"),
});

export type CrearUsuarioValues = z.infer<typeof CrearUsuarioInput>;
export type CrearUsuarioResult = { ok: true } | { ok: false; error: string };

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") throw new Error("Sin permisos");
  return user;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function listarUsuarios(): Promise<UsuarioListItem[]> {
  await requireAdmin();
  return prisma.usuario.findMany({
    where: { rol: "USUARIO" },
    include: { _count: { select: { intentos: true } } },
    orderBy: { creadoEn: "desc" },
  });
}

export async function crearUsuario(raw: CrearUsuarioValues): Promise<CrearUsuarioResult> {
  await requireAdmin();
  const data = CrearUsuarioInput.parse(raw);

  try {
    const hash = await bcrypt.hash(data.password, 10);
    await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: hash,
        rol: "USUARIO",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un usuario con ese correo." };
    }
    return { ok: false, error: "Error al crear el usuario." };
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
