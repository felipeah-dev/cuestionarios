"use client";

import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreguntaField } from "./PreguntaField";
import { Plus, Loader2 } from "lucide-react";
import { CuestionarioInput as schema } from "@/lib/schemas/cuestionario";
import type { CuestionarioFormValues } from "@/lib/schemas/cuestionario";

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

  function addPregunta() {
    append(preguntaVacia(fields.length + 1));
  }

  function handleSubmit(values: CuestionarioFormValues) {
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Preguntas</h2>
            <span className="text-xs text-muted-foreground">{fields.length} pregunta(s)</span>
          </div>

          {typeof preguntasError === "object" && !Array.isArray(preguntasError) && (
            <p className="text-sm text-destructive">{(preguntasError as { message?: string }).message}</p>
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
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
