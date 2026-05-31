import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const cuestionario = await prisma.cuestionario.findUnique({
    where: { id },
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
  let intento = await prisma.intento.findFirst({
    where: { cuestionarioId: id, usuarioId: user.id },
    orderBy: { creadoEn: "desc" },
    include: { respuestas: true },
  });

  // If already submitted or graded, redirect immediately to results
  if (intento && (intento.estado === "ENVIADO" || intento.estado === "CALIFICADO")) {
    redirect(`/usuario/cuestionarios/${id}/resultado`);
  }

  // If no attempt exists, create a new one in state EN_PROGRESO
  if (!intento) {
    intento = await prisma.intento.create({
      data: {
        cuestionarioId: id,
        usuarioId: user.id,
        estado: "EN_PROGRESO",
      },
      include: { respuestas: true },
    });
  }

  return (
    <div className="max-w-4xl mx-auto py-2">
      <QuizForm cuestionario={cuestionario} intento={intento} />
    </div>
  );
}

