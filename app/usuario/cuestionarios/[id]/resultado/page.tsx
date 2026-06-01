import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Resultados de la Evaluación — Portal Académico",
};

export default async function ResultadoCuestionarioPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Retrieve the latest attempt for this questionnaire by the user
  const intento = await prisma.intento.findFirst({
    where: { cuestionarioId: id, usuarioId: user.id },
    orderBy: { creadoEn: "desc" },
    include: {
      cuestionario: {
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
      },
      respuestas: {
        include: {
          opcion: true,
        },
      },
    },
  });

  if (!intento) {
    redirect("/usuario/cuestionarios");
  }

  // Redirect to response form if still in progress
  if (intento.estado === "EN_PROGRESO") {
    redirect(`/usuario/cuestionarios/${id}`);
  }

  const { cuestionario, respuestas } = intento;
  const preguntas = cuestionario.preguntas;

  const esCalificado = intento.estado === "CALIFICADO";
  const calificacion = intento.calificacion ?? 0;

  // Visual status indicators
  let ringColor = "border-destructive text-destructive bg-destructive/5";
  let feedbackMessage = "Necesitas mejorar tu puntuación. Repasa los materiales de clase.";
  if (calificacion >= 70) {
    ringColor = "border-emerald-500 text-emerald-400 bg-emerald-500/5";
    feedbackMessage = "¡Excelente rendimiento académico! Has aprobado satisfactoriamente.";
  } else if (calificacion >= 50) {
    ringColor = "border-amber-500 text-amber-400 bg-amber-500/5";
    feedbackMessage = "Buen esfuerzo, pero tienes áreas de oportunidad. Sigue estudiando.";
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back button */}
      <div>
        <Link href="/usuario/cuestionarios">
          <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground shrink-0 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Cuestionarios
          </Button>
        </Link>
      </div>

      {/* Header section with final grade */}
      <Card className="border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden relative shadow-sm">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-violet-500 to-violet-700" />
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Resumen del Intento</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {cuestionario.titulo}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              {esCalificado
                ? feedbackMessage
                : "Tus respuestas han sido enviadas. Al contener preguntas abiertas, la calificación final se actualizará una vez que el docente las evalúe manualmente."}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-muted-foreground font-semibold pt-1">
              <span>
                Enviado el:{" "}
                {intento.enviadoEn
                  ? new Date(intento.enviadoEn).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Premium score circular display */}
          <div className="shrink-0">
            {esCalificado ? (
              <div
                className={`h-32 w-32 rounded-full border-[8px] flex flex-col items-center justify-center font-extrabold shadow-lg transition-colors ${ringColor}`}
              >
                <span className="text-4xl tracking-tighter">{calificacion.toFixed(0)}</span>
                <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">
                  / 100 PTS
                </span>
              </div>
            ) : (
              <div className="h-32 w-32 rounded-full border-[6px] border-amber-500/20 bg-amber-500/5 flex flex-col items-center justify-center font-extrabold text-amber-400 text-center p-3 animate-pulse">
                <AlertCircle className="h-6 w-6 mb-1 shrink-0" />
                <span className="text-xs tracking-tight leading-snug font-bold">
                  Pendiente de Calificar
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review details */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight border-b border-border/40 pb-2 text-foreground">
          Revisión de Respuestas
        </h2>

        {preguntas.map((p, idx) => {
          const resp = respuestas.find((r) => r.preguntaId === p.id);
          const esMultiple = p.tipo === "OPCION_MULTIPLE";

          let icon = <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5 animate-in zoom-in-50" />;
          let borderStyle = "border-destructive/30 bg-destructive/5 hover:border-destructive/40";
          let footerMessage = null;

          if (esMultiple) {
            const opcionCorrecta = p.opciones.find((o) => o.esCorrecta);
            const esCorrecta = resp?.opcionId && opcionCorrecta && resp.opcionId === opcionCorrecta.id;

            if (esCorrecta) {
              icon = <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-in zoom-in-50" />;
              borderStyle = "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30";
            } else {
              footerMessage = (
                <div className="mt-4 pt-3 border-t border-destructive/20 text-xs text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Opción correcta: <strong className="text-foreground">{opcionCorrecta?.texto}</strong>
                  </span>
                </div>
              );
            }
          } else {
            // Open question evaluation state
            if (resp?.puntajeObtenido !== null && resp?.puntajeObtenido !== undefined) {
              // Graded by teacher
              const porcentajeNota = (resp.puntajeObtenido / p.puntos) * 100;
              if (porcentajeNota >= 70) {
                icon = <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />;
                borderStyle = "border-emerald-500/20 bg-emerald-500/5";
              } else if (porcentajeNota >= 40) {
                icon = <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />;
                borderStyle = "border-amber-500/20 bg-amber-500/5";
              } else {
                icon = <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />;
                borderStyle = "border-destructive/30 bg-destructive/5";
              }
              footerMessage = (
                <div className="mt-4 pt-3 border-t border-border/40 text-xs font-bold flex justify-between items-center">
                  <span className="text-muted-foreground">Calificación del docente:</span>
                  <Badge variant="outline" className="text-primary font-bold border-primary/20 bg-primary/5">
                    {resp.puntajeObtenido} / {p.puntos} pts
                  </Badge>
                </div>
              );
            } else {
              // Pending review
              icon = <HelpCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />;
              borderStyle = "border-amber-500/25 bg-amber-500/5";
              footerMessage = (
                <div className="mt-4 pt-3 border-t border-amber-500/10 text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Pendiente de evaluación por el docente ({p.puntos} pts posibles).</span>
                </div>
              );
            }
          }

          return (
            <Card
              key={p.id}
              className={`border transition-all duration-300 ${borderStyle} shadow-sm overflow-hidden`}
            >
              <CardHeader className="pb-3 border-b border-border/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {icon}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-muted-foreground">
                        Pregunta {idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-foreground mt-1 leading-snug">
                        {p.texto}
                      </h3>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0 font-bold bg-background/50 border-border/80"
                  >
                    {esMultiple
                      ? `${resp?.puntajeObtenido ?? 0} / ${p.puntos} pts`
                      : `Valor: ${p.puntos} pts`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {esMultiple ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {p.opciones.map((opc) => {
                      const fueSeleccionada = resp?.opcionId === opc.id;
                      const esCorrecta = opc.esCorrecta;

                      let opcStyle = "border-border/40 bg-secondary/10";
                      let indicator = null;

                      if (fueSeleccionada) {
                        if (esCorrecta) {
                          opcStyle = "border-emerald-500 bg-emerald-500/10 font-bold";
                          indicator = (
                            <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/20 shrink-0">
                              Tu Selección — Correcta
                            </span>
                          );
                        } else {
                          opcStyle = "border-destructive bg-destructive/10 font-bold";
                          indicator = (
                            <span className="text-[10px] font-bold text-destructive px-2 py-0.5 rounded bg-destructive/20 border border-destructive/20 shrink-0">
                              Tu Selección — Incorrecta
                            </span>
                          );
                        }
                      } else if (esCorrecta) {
                        opcStyle = "border-emerald-500/30 bg-emerald-500/5";
                      }

                      return (
                        <div
                          key={opc.id}
                          className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border text-sm transition-all ${opcStyle}`}
                        >
                          <span className="text-foreground/90 leading-snug">{opc.texto}</span>
                          {indicator}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                      Tu Respuesta Escrita:
                    </span>
                    <div className="p-4 rounded-xl border border-border/60 bg-background/60 text-sm leading-relaxed text-foreground min-h-[60px] whitespace-pre-wrap">
                      {resp?.respuestaAbierta || (
                        <span className="text-muted-foreground italic">
                          No respondiste a esta pregunta.
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {footerMessage}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

