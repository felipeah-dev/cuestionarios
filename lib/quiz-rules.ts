export type QuizQuestionType = "OPCION_MULTIPLE" | "ABIERTA";

type QuestionLike = {
  tipo: QuizQuestionType;
};

export const MULTIPLE_CHOICE_MINUTES = 1;
export const OPEN_QUESTION_MINUTES = 5;

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
  const startedAt = new Date(creadoEn).getTime();
  const durationMs = durationMinutes * 60 * 1000;
  const remainingMs = startedAt + durationMs - now.getTime();

  return Math.max(0, Math.ceil(remainingMs / 1000));
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
