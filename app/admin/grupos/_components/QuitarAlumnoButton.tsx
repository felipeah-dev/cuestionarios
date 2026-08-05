"use client";

import { Loader2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { eliminarAlumnoDelGrupoAction } from "../_actions";

interface Props {
  grupoId: string;
  usuarioId: string;
  alumnoNombre: string;
}

export function QuitarAlumnoButton({ grupoId, usuarioId, alumnoNombre }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setError(null);
    setOpen(nextOpen);
  }

  function removeStudent() {
    setError(null);
    startTransition(async () => {
      try {
        await eliminarAlumnoDelGrupoAction(grupoId, usuarioId);
        setOpen(false);
        router.refresh();
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : "No se pudo retirar al alumno"
        );
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <UserMinus className="h-3.5 w-3.5" />
        Retirar
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Retirar alumno del grupo</DialogTitle>
            <DialogDescription>
              {alumnoNombre} dejara de ver los cuestionarios de esta materia. Su cuenta y
              sus intentos anteriores se conservaran.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={removeStudent}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Retirar alumno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
