import { z } from "zod/v3";

export const GrupoInput = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(300, "La descripcion no puede superar 300 caracteres")
    .optional(),
});

export const CodigoGrupoInput = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "Ingresa un codigo valido de 6 caracteres");

export type GrupoFormValues = z.infer<typeof GrupoInput>;
