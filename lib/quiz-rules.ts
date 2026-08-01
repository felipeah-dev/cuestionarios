export type QuizQuestionType = "OPCION_MULTIPLE" | "ABIERTA";

type QuestionLike = {
  tipo: QuizQuestionType;
};

type AttemptTimingLike = {
  estado?: string;
  creadoEn: Date | string;
  reactivadoEn?: Date | string | null;
  tiempoRestanteSegundos?: number | null;
};

export const MULTIPLE_CHOICE_MINUTES = 1;
export const OPEN_QUESTION_MINUTES = 5;

export const ACTIVE_ATTEMPT_STATUSES = [
  "EN_PROGRESO",
  "REACTIVADO_POR_ADMIN",
] as const;

export function isActiveAttemptStatus(estado: string) {
  return ACTIVE_ATTEMPT_STATUSES.includes(
    estado as (typeof ACTIVE_ATTEMPT_STATUSES)[number]
  );
}

export function getQuestionEstimatedMinutes(tipo: QuizQuestionType) {
  return tipo === "ABIERTA" ? OPEN_QUESTION_MINUTES : MULTIPLE_CHOICE_MINUTES;
}

export function getQuizEstimatedMinutes(preguntas: QuestionLike[]) {
  return preguntas.reduce(
    (total, pregunta) => total + getQuestionEstimatedMinutes(pregunta.tipo),
    0
  );
}

export function getQuizEstimatedSeconds(preguntas: QuestionLike[]) {
  return getQuizEstimatedMinutes(preguntas) * 60;
}

export function getAttemptRemainingSeconds(
  creadoEn: Date | string,
  durationMinutes: number,
  now: Date = new Date()
) {
  return getRemainingSecondsFromStart(creadoEn, durationMinutes * 60, now);
}

export function getRemainingSecondsFromStart(
  startedAt: Date | string,
  durationSeconds: number,
  now: Date = new Date()
) {
  const startedAtMs = new Date(startedAt).getTime();
  const durationMs = durationSeconds * 1000;
  const remainingMs = startedAtMs + durationMs - now.getTime();

  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function getAttemptTimingStart(intento: AttemptTimingLike) {
  if (intento.estado === "REACTIVADO_POR_ADMIN" && intento.reactivadoEn) {
    return intento.reactivadoEn;
  }

  return intento.creadoEn;
}

export function getActiveAttemptRemainingSeconds(
  intento: AttemptTimingLike,
  durationMinutes: number,
  now: Date = new Date()
) {
  const storedRemainingSeconds =
    typeof intento.tiempoRestanteSegundos === "number"
      ? Math.max(0, intento.tiempoRestanteSegundos)
      : null;

  if (intento.estado === "PAUSADO_REVISION_IA" && storedRemainingSeconds !== null) {
    return storedRemainingSeconds;
  }

  if (intento.estado === "REACTIVADO_POR_ADMIN") {
    if (storedRemainingSeconds !== null) {
      if (!intento.reactivadoEn) return storedRemainingSeconds;

      return getRemainingSecondsFromStart(
        intento.reactivadoEn,
        storedRemainingSeconds,
        now
      );
    }

    if (intento.reactivadoEn) {
      return getAttemptRemainingSeconds(intento.reactivadoEn, durationMinutes, now);
    }
  }

  return getAttemptRemainingSeconds(
    intento.creadoEn,
    durationMinutes,
    now
  );
}

export function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return "0 minutos";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  }

  if (remainingMinutes > 0) {
    parts.push(
      `${remainingMinutes} ${remainingMinutes === 1 ? "minuto" : "minutos"}`
    );
  }

  return parts.join(" ");
}

export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function calculateFinalPercentage(obtained: number, max: number) {
  if (max <= 0) return 0;
  return clampPercentage((obtained / max) * 100);
}
