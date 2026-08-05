"use client";

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unirseAGrupoAction } from "../_actions";

export function UnirseGrupoForm() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const result = await unirseAGrupoAction(codigo);
        setMessage(result.message);
        setCodigo("");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo completar la inscripcion"
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Unirme a una materia</h2>
          <p className="text-sm text-muted-foreground">
            Escribe el codigo de 6 caracteres que te compartio tu profesor.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={codigo}
          onChange={(event) =>
            setCodigo(
              event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6)
            )
          }
          placeholder="ABC123"
          aria-label="Codigo del grupo"
          autoComplete="off"
          maxLength={6}
          className="h-11 font-mono text-lg font-bold tracking-[0.22em] uppercase sm:max-w-xs"
        />
        <Button type="submit" className="h-11 px-5" disabled={isPending || codigo.length !== 6}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Unirme al grupo
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </form>
  );
}
