"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, Plus, GripVertical } from "lucide-react";
import type { CuestionarioFormValues } from "../_actions";

interface Props {
  index: number;
  onRemove: () => void;
}

export function PreguntaField({ index, onRemove }: Props) {
  const form = useFormContext<CuestionarioFormValues>();
  const { register, watch, setValue, formState: { errors } } = form;

  const tipo = watch(`preguntas.${index}.tipo`);
  const opciones = watch(`preguntas.${index}.opciones`) ?? [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `preguntas.${index}.opciones`,
  });

  const preguntaErrors = errors.preguntas?.[index];

  function handleCorrectaChange(opcionIndex: number) {
    fields.forEach((_, i) => {
      setValue(`preguntas.${index}.opciones.${i}.esCorrecta`, i === opcionIndex, {
        shouldValidate: true,
      });
    });
  }

  function addOpcion() {
    append({ texto: "", esCorrecta: false });
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-start gap-3">
        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
        <span className="text-primary font-bold text-lg shrink-0">{index + 1}.</span>
        <div className="flex-1 space-y-3">
          <input
            {...register(`preguntas.${index}.texto`)}
            placeholder="Texto de la pregunta..."
            className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 pb-1 text-base font-medium focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          {preguntaErrors?.texto && (
            <p className="text-xs text-destructive">{preguntaErrors.texto.message}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pl-14">
        {/* Tipo, puntos */}
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tipo
            </label>
            <select
              {...register(`preguntas.${index}.tipo`)}
              className="block rounded-md border border-slate-300 dark:border-slate-600 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="OPCION_MULTIPLE">Opción múltiple</option>
              <option value="ABIERTA">Abierta</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Puntos
            </label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              {...register(`preguntas.${index}.puntos`, { valueAsNumber: true })}
              className="w-24"
              placeholder="1"
            />
            {preguntaErrors?.puntos && (
              <p className="text-xs text-destructive">{preguntaErrors.puntos.message}</p>
            )}
          </div>
        </div>

        {/* Opciones (solo OPCION_MULTIPLE) */}
        {tipo === "OPCION_MULTIPLE" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Opciones — marca la correcta
            </p>

            {fields.map((field, opIdx) => {
              const esCorrecta = opciones[opIdx]?.esCorrecta ?? false;
              return (
                <div
                  key={field.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    esCorrecta
                      ? "border-primary bg-primary/10"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name={`correcta-${index}`}
                    checked={esCorrecta}
                    onChange={() => handleCorrectaChange(opIdx)}
                    className="accent-primary shrink-0"
                  />
                  <Input
                    {...register(`preguntas.${index}.opciones.${opIdx}.texto`)}
                    placeholder={`Opción ${opIdx + 1}`}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => remove(opIdx)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Error de opciones */}
            {preguntaErrors?.opciones && !Array.isArray(preguntaErrors.opciones) && (
              <p className="text-xs text-destructive">
                {(preguntaErrors.opciones as { message?: string }).message}
              </p>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addOpcion}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir opción
            </Button>
          </div>
        )}

        {tipo === "ABIERTA" && (
          <p className="text-xs text-muted-foreground italic">
            Respuesta abierta — el admin la calificará manualmente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
