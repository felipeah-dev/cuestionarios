import { z } from "zod";

export const proctoringAiResultSchema = z.object({
  celular_detectado: z.boolean(),
  mirada_fuera_de_pantalla: z.boolean(),
  otra_persona_presente: z.boolean(),
  material_no_permitido: z.boolean(),
  camara_obstruida: z.boolean(),
  descripcion_breve: z.string().min(1),
  nivel_alerta: z.enum(["bajo", "medio", "alto"]),
  confianza: z.number().min(0).max(1),
  requiere_revision_humana: z.boolean(),
});

export type ProctoringAiResult = z.infer<typeof proctoringAiResultSchema>;

export const proctoringResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    celular_detectado: { type: "boolean" },
    mirada_fuera_de_pantalla: { type: "boolean" },
    otra_persona_presente: { type: "boolean" },
    material_no_permitido: { type: "boolean" },
    camara_obstruida: { type: "boolean" },
    descripcion_breve: { type: "string" },
    nivel_alerta: { type: "string", enum: ["bajo", "medio", "alto"] },
    confianza: { type: "number", minimum: 0, maximum: 1 },
    requiere_revision_humana: { type: "boolean" },
  },
  required: [
    "celular_detectado",
    "mirada_fuera_de_pantalla",
    "otra_persona_presente",
    "material_no_permitido",
    "camara_obstruida",
    "descripcion_breve",
    "nivel_alerta",
    "confianza",
    "requiere_revision_humana",
  ],
};

export function mapAlertLevel(level: ProctoringAiResult["nivel_alerta"]) {
  if (level === "alto") return "ALTO";
  if (level === "medio") return "MEDIO";
  return "BAJO";
}
