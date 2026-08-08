"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmarIntentoIrregularidadAction,
  reactivarIntentoFalsoPositivoAction,
} from "../_actions";

type ProctoringReviewActionsProps = {
  intentoId: string;
  estadoIntento?: string;
  disabled?: boolean;
};

export function ProctoringReviewActions({
  intentoId,
  estadoIntento,
  disabled,
}: ProctoringReviewActionsProps) {
  const [isPending, startTransition] = useTransition();
  const isDisabled = disabled || isPending;

  const isCancelled = estadoIntento === "CANCELADO_CONFIRMADO";
  const isReactivated = estadoIntento === "REACTIVADO_POR_ADMIN";
  const isCompleted = estadoIntento === "ENVIADO" || estadoIntento === "CALIFICADO";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="destructive"
        size="default"
        className="rounded-xl font-bold gap-2 shadow-md shadow-destructive/10 cursor-pointer text-xs sm:text-sm"
        disabled={isDisabled || isCancelled}
        onClick={() =>
          startTransition(async () => {
            await confirmarIntentoIrregularidadAction(intentoId);
          })
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {isCancelled ? "Trampa Confirmada" : "Confirmar Trampa"}
      </Button>

      {!isCompleted && (
        <Button
          type="button"
          variant="outline"
          size="default"
          className="rounded-xl border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-bold gap-2 shadow-sm cursor-pointer text-xs sm:text-sm"
          disabled={isDisabled || isReactivated}
          onClick={() =>
            startTransition(async () => {
              await reactivarIntentoFalsoPositivoAction(intentoId);
            })
          }
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isReactivated ? "Examen Reactivado" : "Reactivar Examen"}
        </Button>
      )}
    </div>
  );
}
