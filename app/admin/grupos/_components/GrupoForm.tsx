"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrupoInput, type GrupoFormValues } from "@/lib/schemas/grupo";
import { crearGrupoAction } from "../_actions";

interface Props {
  defaultValues?: GrupoFormValues;
  onSubmit?: (values: GrupoFormValues) => Promise<{ ok: boolean }>;
  submitLabel?: string;
  redirectTo?: string;
  showCodeNotice?: boolean;
}

export function GrupoForm({
  defaultValues,
  onSubmit: submitAction = crearGrupoAction,
  submitLabel = "Crear grupo",
  redirectTo = "/admin/grupos",
  showCodeNotice = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<GrupoFormValues>({
    resolver: zodResolver(GrupoInput),
    defaultValues: defaultValues ?? { nombre: "", descripcion: "" },
  });

  function onSubmit(values: GrupoFormValues) {
    setServerError(null);
    startTransition(async () => {
      try {
        await submitAction(values);
        router.push(redirectTo);
        router.refresh();
      } catch (error) {
        setServerError(
          error instanceof Error ? error.message : "No se pudo crear el grupo"
        );
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-foreground">
          Nombre de la materia o grupo <span className="text-destructive">*</span>
        </label>
        <Input
          id="nombre"
          {...form.register("nombre")}
          placeholder="Ej. Programacion de software"
          className={form.formState.errors.nombre ? "border-destructive" : ""}
        />
        {form.formState.errors.nombre && (
          <p className="text-xs text-destructive">
            {form.formState.errors.nombre.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="descripcion" className="text-sm font-medium text-foreground">
          Descripcion <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="descripcion"
          {...form.register("descripcion")}
          rows={4}
          placeholder="Semestre, horario o indicaciones para los alumnos..."
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {form.formState.errors.descripcion && (
          <p className="text-xs text-destructive">
            {form.formState.errors.descripcion.message}
          </p>
        )}
      </div>

      {showCodeNotice && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          Al crear el grupo se generara automaticamente un codigo de 6 caracteres para
          compartir con tus alumnos.
        </div>
      )}

      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
