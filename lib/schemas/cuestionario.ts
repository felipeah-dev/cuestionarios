import { z } from "zod/v3";

const OpcionInput = z.object({
  texto: z.string(),
  esCorrecta: z.boolean(),
});

const PreguntaInput = z
  .object({
    texto: z.string().min(1, "El texto de la pregunta es requerido"),
    tipo: z.enum(["OPCION_MULTIPLE", "ABIERTA"]),
    puntos: z
      .number()
      .positive("La ponderacion debe ser mayor a 0")
      .max(100, "Una pregunta no puede superar el 100%"),
    orden: z.number().int(),
    opciones: z.array(OpcionInput).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.tipo === "OPCION_MULTIPLE") {
      const lista = val.opciones ?? [];
      if (lista.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Debe tener al menos 2 opciones",
          path: ["opciones"],
        });
      }
      if (lista.some((o) => !o.texto.trim())) {
        ctx.addIssue({
          code: "custom",
          message: "Todas las opciones deben tener texto",
          path: ["opciones"],
        });
      }
      if (lista.filter((o) => o.esCorrecta).length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "Debe haber exactamente una opcion correcta",
          path: ["opciones"],
        });
      }
    }
  });

export const CuestionarioInput = z
  .object({
    titulo: z.string().min(1, "El titulo es requerido"),
    descripcion: z.string().optional(),
    preguntas: z.array(PreguntaInput).min(1, "Debe tener al menos una pregunta"),
  })
  .superRefine((val, ctx) => {
    const totalPonderacion = val.preguntas.reduce(
      (total, pregunta) => total + pregunta.puntos,
      0
    );

    if (totalPonderacion > 100) {
      ctx.addIssue({
        code: "custom",
        message: "La ponderacion total del cuestionario no puede superar el 100%.",
        path: ["preguntas"],
      });
    }
  });

export type CuestionarioFormValues = z.infer<typeof CuestionarioInput>;
