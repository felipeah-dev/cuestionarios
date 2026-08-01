"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  anularAlertaProctoringAction,
  confirmarAlertaProctoringAction,
} from "../_actions";

type ProctoringReviewActionsProps = {
  alertId: string;
  disabled?: boolean;
};

export function ProctoringReviewActions({
  alertId,
  disabled,
}: ProctoringReviewActionsProps) {
  const [isPending, startTransition] = useTransition();
  const isDisabled = disabled || isPending;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="rounded-xl font-bold"
        disabled={isDisabled}
        onClick={() =>
          startTransition(async () => {
            await confirmarAlertaProctoringAction(alertId);
          })
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Confirmar trampa
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-bold"
        disabled={isDisabled}
        onClick={() =>
          startTransition(async () => {
            await anularAlertaProctoringAction(alertId);
          })
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Anular / habilitar examen
      </Button>
    </div>
  );
}
