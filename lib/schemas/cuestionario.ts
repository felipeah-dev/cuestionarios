import { z } from "zod";

const OpcionInput = z.object({
  texto: z.string(),
  esCorrecta: z.boolean(),
});

const PreguntaInput = z
  .object({
    texto: z.string().min(1, "El texto de la pregunta es requerido"),
    tipo: z.enum(["OPCION_MULTIPLE", "ABIERTA"]),
    puntos: z.number().positive("Los puntos deben ser mayores a 0"),
    orden: z.number().int(),
    opciones: z.array(OpcionInput).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.tipo === "OPCION_MULTIPLE") {
      const lista = val.opciones ?? [];
      if (lista.length < 2) {
        ctx.addIssue({ code: "custom", message: "Debe tener al menos 2 opciones", path: ["opciones"] });
      }
      if (lista.some((o) => !o.texto.trim())) {
        ctx.addIssue({ code: "custom", message: "Todas las opciones deben tener texto", path: ["opciones"] });
      }
      if (lista.filter((o) => o.esCorrecta).length !== 1) {
        ctx.addIssue({ code: "custom", message: "Debe haber exactamente una opción correcta", path: ["opciones"] });
      }
    }
  });

export const CuestionarioInput = z.object({
  titulo: z.string().min(1, "El título es requerido"),
  descripcion: z.string().optional(),
  preguntas: z.array(PreguntaInput).min(1, "Debe tener al menos una pregunta"),
});

export type CuestionarioFormValues = z.infer<typeof CuestionarioInput>;
