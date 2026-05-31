"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { eliminarCuestionario } from "../_actions";

interface Props {
  id: string;
  titulo: string;
}

export function AccionesRow({ id, titulo }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await eliminarCuestionario(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar");
      } finally {
        setConfirming(false);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <Link
          href={`/admin/cuestionarios/${id}/editar`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(true)}
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </Button>
      </div>

      {/* Modal de confirmación */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">¿Eliminar cuestionario?</h3>
            <p className="text-sm text-muted-foreground">
              Se eliminará <span className="font-medium text-foreground">"{titulo}"</span> junto con
              todas sus preguntas, opciones e intentos. Esta acción no se puede deshacer.
            </p>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
