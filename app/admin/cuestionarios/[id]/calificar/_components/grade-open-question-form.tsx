"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gradeOpenQuestionAction } from "../_actions";

interface GradeOpenQuestionFormProps {
  respuestaId: string;
  maxScore: number;
  currentScore: number | null;
  disabled?: boolean;
}

export function GradeOpenQuestionForm({
  respuestaId,
  maxScore,
  currentScore,
  disabled = false,
}: GradeOpenQuestionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [score, setScore] = useState(currentScore?.toString() ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const numericScore = Number(score);

    if (score.trim() === "" || !Number.isFinite(numericScore)) {
      setError("Escribe un puntaje valido.");
      return;
    }

    if (numericScore < 0 || numericScore > maxScore) {
      setError(`El puntaje debe estar entre 0 y ${maxScore}.`);
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await gradeOpenQuestionAction(respuestaId, numericScore);

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setMessage(
          result.intentoCalificado
            ? "Puntaje guardado. Intento calificado."
            : "Puntaje guardado."
        );
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:max-w-40">
          <label
            htmlFor={`score-${respuestaId}`}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Puntaje
          </label>
          <Input
            id={`score-${respuestaId}`}
            type="number"
            min="0"
            max={maxScore}
            step="0.01"
            value={score}
            disabled={disabled || isPending}
            onChange={(event) => setScore(event.target.value)}
            className="h-9"
            placeholder={`0 - ${maxScore}`}
          />
        </div>

        <Button
          type="submit"
          disabled={disabled || isPending}
          className="h-9 sm:mb-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>

      <div aria-live="polite" className="min-h-5">
        {error ? (
          <p className="text-xs font-medium text-destructive">{error}</p>
        ) : message ? (
          <p className="text-xs font-medium text-emerald-600">{message}</p>
        ) : null}
      </div>
    </form>
  );
}
