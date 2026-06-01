import Link from "next/link";
import { EstadoIntento, TipoPregunta } from "@prisma/client";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileQuestion,
  Percent,
  UserRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { GradeOpenQuestionForm } from "./_components/grade-open-question-form";

interface Props {
  params: Promise<{ id: string }>;
}

const numberFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function formatDate(value: Date | null) {
  if (!value) return "Pendiente";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getAnswerStatusClass(puntaje: number | null, puntos: number) {
  if (puntaje === null) return "border-warning bg-warning/10";
  if (puntaje >= puntos) return "border-emerald-500 bg-emerald-500/10";
  return "border-destructive bg-destructive/10";
}

function getAnswerStatusLabel(puntaje: number | null, puntos: number) {
  if (puntaje === null) return "Pendiente";
  if (puntaje >= puntos) return "Completa";
  return "Revisada";
}

export default async function CalificarCuestionarioPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const intento = await prisma.intento.findUnique({
    where: { id },
    include: {
      cuestionario: {
        select: {
          titulo: true,
          descripcion: true,
          adminId: true,
        },
      },
      usuario: {
        select: {
          nombre: true,
          email: true,
        },
      },
      respuestas: {
        include: {
          opcion: true,
          pregunta: {
            include: {
              opciones: true,
            },
          },
        },
      },
    },
  });

  if (!intento) notFound();
  if (intento.cuestionario.adminId !== user.id) redirect("/admin/dashboard");

  const respuestas = [...intento.respuestas].sort(
    (a, b) => a.pregunta.orden - b.pregunta.orden
  );
  const totalPreguntas = respuestas.length;
  const respuestasCalificadas = respuestas.filter(
    (respuesta) => respuesta.puntajeObtenido !== null
  ).length;
  const respuestasPendientes = totalPreguntas - respuestasCalificadas;
  const abiertasPendientes = respuestas.filter(
    (respuesta) =>
      respuesta.pregunta.tipo === TipoPregunta.ABIERTA &&
      respuesta.puntajeObtenido === null
  ).length;
  const puntosObtenidos = respuestas.reduce(
    (total, respuesta) => total + (respuesta.puntajeObtenido ?? 0),
    0
  );
  const puntosMaximos = respuestas.reduce(
    (total, respuesta) => total + respuesta.pregunta.puntos,
    0
  );
  const calificacionCalculada =
    puntosMaximos > 0 ? (puntosObtenidos / puntosMaximos) * 100 : 0;
  const calificacionVisible =
    intento.calificacion ?? (respuestasPendientes === 0 ? calificacionCalculada : null);
  const canGrade =
    intento.estado === EstadoIntento.ENVIADO ||
    intento.estado === EstadoIntento.CALIFICADO;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/admin/cuestionarios"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Cuestionarios
          </Link>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Calificar intento
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "border font-bold",
                  intento.estado === EstadoIntento.CALIFICADO &&
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                  intento.estado === EstadoIntento.ENVIADO &&
                    "border-warning/40 bg-warning/10 text-warning",
                  intento.estado === EstadoIntento.EN_PROGRESO &&
                    "border-border bg-muted text-muted-foreground"
                )}
              >
                {intento.estado}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {intento.cuestionario.titulo}
              {intento.cuestionario.descripcion
                ? ` - ${intento.cuestionario.descripcion}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Alumno</CardDescription>
            <UserRound className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground">{intento.usuario.nombre}</p>
            <p className="mt-1 text-xs text-muted-foreground">{intento.usuario.email}</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Progreso</CardDescription>
            <FileQuestion className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {respuestasCalificadas}/{totalPreguntas}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {abiertasPendientes} abiertas pendientes
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Puntaje</CardDescription>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {formatNumber(puntosObtenidos)}/{formatNumber(puntosMaximos)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Puntos obtenidos</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Calificacion</CardDescription>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {calificacionVisible === null
                ? "Pendiente"
                : formatPercent(calificacionVisible)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Calificado: {formatDate(intento.calificadoEn)}
            </p>
          </CardContent>
        </Card>
      </div>

      {!canGrade ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning bg-warning/10 p-4">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm font-medium text-foreground">
            Este intento aun esta en progreso. Podras calificarlo cuando el alumno
            lo envie.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {respuestas.map((respuesta) => {
          const isOpenQuestion = respuesta.pregunta.tipo === TipoPregunta.ABIERTA;
          const selectedOption = respuesta.opcion;
          const statusClass = getAnswerStatusClass(
            respuesta.puntajeObtenido,
            respuesta.pregunta.puntos
          );
          const statusLabel = getAnswerStatusLabel(
            respuesta.puntajeObtenido,
            respuesta.pregunta.puntos
          );

          return (
            <Card
              key={respuesta.id}
              className={cn(
                "border shadow-sm transition-colors",
                statusClass
              )}
            >
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-card/70">
                      Pregunta {respuesta.pregunta.orden}
                    </Badge>
                    <Badge variant="outline" className="bg-card/70">
                      {isOpenQuestion ? "Abierta" : "Opcion multiple"}
                    </Badge>
                    <Badge variant="outline" className="bg-card/70">
                      {statusLabel}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {respuesta.pregunta.texto}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm font-bold">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  {respuesta.puntajeObtenido === null
                    ? "-"
                    : formatNumber(respuesta.puntajeObtenido)}
                  <span className="text-muted-foreground">
                    / {formatNumber(respuesta.pregunta.puntos)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isOpenQuestion ? (
                  <>
                    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Respuesta del alumno
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {respuesta.respuestaAbierta?.trim() || "Sin respuesta."}
                      </p>
                    </div>

                    <GradeOpenQuestionForm
                      key={`${respuesta.id}-${respuesta.puntajeObtenido ?? "pending"}`}
                      respuestaId={respuesta.id}
                      maxScore={respuesta.pregunta.puntos}
                      currentScore={respuesta.puntajeObtenido}
                      disabled={!canGrade}
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Opcion seleccionada
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {selectedOption?.texto ?? "Sin opcion seleccionada."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {respuesta.pregunta.opciones.map((opcion) => {
                        const isSelected = opcion.id === respuesta.opcionId;
                        const isCorrect = opcion.esCorrecta;

                        return (
                          <div
                            key={opcion.id}
                            className={cn(
                              "rounded-xl border bg-card/70 p-3 text-sm",
                              isSelected && "border-primary bg-primary/10",
                              isCorrect && "border-emerald-500 bg-emerald-500/10"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{opcion.texto}</span>
                              <div className="flex shrink-0 gap-1">
                                {isSelected ? (
                                  <Badge className="bg-primary/10 text-primary">
                                    Elegida
                                  </Badge>
                                ) : null}
                                {isCorrect ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600">
                                    Correcta
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
