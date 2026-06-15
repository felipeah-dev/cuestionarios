"use client";

import { useFieldArray, useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreguntaField } from "./PreguntaField";
import { AlertTriangle, Clock3, Loader2, Percent, Plus } from "lucide-react";
import { CuestionarioInput as schema } from "@/lib/schemas/cuestionario";
import type { CuestionarioFormValues } from "@/lib/schemas/cuestionario";
import { formatDuration, getQuizEstimatedMinutes } from "@/lib/quiz-rules";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function preguntaVacia(orden: number) {
  return {
    texto: "",
    tipo: "OPCION_MULTIPLE" as const,
    puntos: 1,
    orden,
    opciones: [
      { texto: "", esCorrecta: false },
      { texto: "", esCorrecta: false },
    ],
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  defaultValues?: CuestionarioFormValues;
  onSubmit: (data: CuestionarioFormValues) => Promise<{ ok: boolean }>;
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CuestionarioForm({ defaultValues, onSubmit, submitLabel = "Guardar" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CuestionarioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      titulo: "",
      descripcion: "",
      preguntas: [preguntaVacia(1)],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "preguntas",
  });

  const preguntas = useWatch({
    control: form.control,
    name: "preguntas",
  }) ?? [];
  const totalPonderacion = preguntas.reduce(
    (total, pregunta) => total + (Number.isFinite(pregunta.puntos) ? pregunta.puntos : 0),
    0
  );
  const duracionEstimada = getQuizEstimatedMinutes(preguntas);
  const ponderacionExcedida = totalPonderacion > 100;

  function addPregunta() {
    append(preguntaVacia(fields.length + 1));
  }

  function handleSubmit(values: CuestionarioFormValues) {
    if (ponderacionExcedida) {
      setServerError("La ponderacion total no puede pasar del 100%.");
      return;
    }

    // Reasigna orden según posición actual
    const data: CuestionarioFormValues = {
      ...values,
      preguntas: values.preguntas.map((p, i) => ({ ...p, orden: i + 1 })),
    };

    setServerError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
        router.push("/admin/cuestionarios");
        router.refresh();
      } catch (e) {
        setServerError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  const preguntasError = form.formState.errors.preguntas;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Datos generales */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Título <span className="text-destructive">*</span>
            </label>
            <Input
              {...form.register("titulo")}
              placeholder="Ej. Examen parcial de álgebra"
              className={form.formState.errors.titulo ? "border-destructive" : ""}
            />
            {form.formState.errors.titulo && (
              <p className="text-xs text-destructive">{form.formState.errors.titulo.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              {...form.register("descripcion")}
              rows={2}
              placeholder="Instrucciones generales, temas cubiertos..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Preguntas */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Preguntas</h2>
              <p className="text-xs text-muted-foreground">{fields.length} pregunta(s)</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
                  ponderacionExcedida
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-muted/50 text-muted-foreground"
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                Ponderacion: {totalPonderacion.toFixed(1)} / 100%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Duracion estimada: {formatDuration(duracionEstimada)}
              </span>
            </div>
          </div>

          {typeof preguntasError === "object" && !Array.isArray(preguntasError) && (
            <p className="text-sm text-destructive">{(preguntasError as { message?: string }).message}</p>
          )}

          {ponderacionExcedida && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                La ponderacion total es de {totalPonderacion.toFixed(1)}%.
                Reduce el valor de una o mas preguntas para que sea 100% o menos.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <PreguntaField
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={addPregunta}
            className="w-full border border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir pregunta
          </Button>
        </div>

        {/* Error servidor */}
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || ponderacionExcedida}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
