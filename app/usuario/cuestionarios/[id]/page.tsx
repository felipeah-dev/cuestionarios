import { getCurrentUser } from "@/lib/auth";
import { finalizeQuizAttemptForUser } from "@/lib/quiz-finalization";
import { prisma } from "@/lib/prisma";
import {
  getNoiseCalibrationMs,
  getNoiseCooldownMs,
  getNoiseRecordingMs,
  getNoiseSustainedMs,
  getProctoringCaptureMaxSeconds,
  getProctoringCaptureMinSeconds,
  MIN_NOISE_RMS_FLOOR,
  NOISE_RMS_MULTIPLIER,
} from "@/lib/proctoring/config";
import {
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
  isActiveAttemptStatus,
} from "@/lib/quiz-rules";
import { redirect } from "next/navigation";
import QuizForm from "./_components/QuizForm";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Respondiendo Cuestionario — Portal Académico",
};

export default async function ResponderCuestionarioPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch the questionnaire with questions ordered and options
  const cuestionario = await prisma.cuestionario.findFirst({
    where: {
      id,
      OR: [
        { grupoId: null },
        { grupo: { miembros: { some: { usuarioId: user.id } } } },
      ],
    },
    include: {
      preguntas: {
        orderBy: { orden: "asc" },
        include: {
          opciones: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  if (!cuestionario) {
    redirect("/usuario/cuestionarios");
  }

  // Find the user's attempt for this questionnaire
  const intento = await prisma.intento.findFirst({
    where: { cuestionarioId: id, usuarioId: user.id },
    orderBy: { creadoEn: "desc" },
    include: { respuestas: true },
  });

  if (intento?.estado === "PAUSADO_REVISION_IA") {
    redirect(`/usuario/cuestionarios/${id}/pausado`);
  }

  // If already submitted, graded, or cancelled by review, redirect immediately to results
  if (
    intento &&
    (intento.estado === "ENVIADO" ||
      intento.estado === "CALIFICADO" ||
      intento.estado === "CANCELADO_CONFIRMADO")
  ) {
    redirect(`/usuario/cuestionarios/${id}/resultado`);
  }

  if (intento && isActiveAttemptStatus(intento.estado)) {
    const remainingSeconds = getActiveAttemptRemainingSeconds(
      intento,
      getQuizEstimatedMinutes(cuestionario.preguntas)
    );

    if (remainingSeconds <= 0) {
      await finalizeQuizAttemptForUser({
        intentoId: intento.id,
        usuarioId: user.id,
      });

      redirect(`/usuario/cuestionarios/${id}/resultado`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-2">
      <QuizForm
        cuestionario={cuestionario}
        intento={intento}
        proctoringConfig={{
          captureMinSeconds: getProctoringCaptureMinSeconds(),
          captureMaxSeconds: getProctoringCaptureMaxSeconds(),
          noiseRmsMultiplier: NOISE_RMS_MULTIPLIER,
          minNoiseRmsFloor: MIN_NOISE_RMS_FLOOR,
          noiseSustainedMs: getNoiseSustainedMs(),
          noiseRecordingMs: getNoiseRecordingMs(),
          noiseCooldownMs: getNoiseCooldownMs(),
          noiseCalibrationMs: getNoiseCalibrationMs(),
        }}
      />
    </div>
  );
}

