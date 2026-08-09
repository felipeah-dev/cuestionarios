import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProctoringReviewActions } from "../../../_components/ProctoringReviewActions";
import {
  ChevronLeft,
  ShieldAlert,
  AlertTriangle,
  User,
  Clock,
  Camera,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  GraduationCap,
  ExternalLink,
} from "lucide-react";

interface Props {
  params: Promise<{ cuestionarioId: string; estudianteId: string; intentoId: string }>;
  searchParams: Promise<{ modo?: string }>;
}

export const metadata = {
  title: "Evidencias del Intento — Supervisión",
};

function getAiDescription(json: unknown, isNoise = false): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "descripcion_breve" in json &&
    typeof (json as Record<string, unknown>).descripcion_breve === "string"
  ) {
    return (json as Record<string, unknown>).descripcion_breve as string;
  }
  if (isNoise) {
    return "Se detectó ruido excesivo o habla continua en el micrófono (+15 dB sobre el nivel base de silencio).";
  }
  return "Posible desvío de mirada o interferencia en la captura visual de la cámara.";
}

export default async function AdminProctoringIntentoDetailPage({
  params,
  searchParams,
}: Props) {
  const { cuestionarioId, estudianteId, intentoId } = await params;
  const { modo } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      cuestionarioId,
      usuarioId: estudianteId,
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          email: true,
        },
      },
      cuestionario: {
        select: {
          titulo: true,
          adminId: true,
          grupo: {
            select: {
              nombre: true,
            },
          },
        },
      },
      alertasProctoring: {
        orderBy: { creadoEn: "desc" },
      },
    },
  });

  if (!intento || intento.cuestionario.adminId !== user.id) {
    notFound();
  }

  // Obtener fronteras de reactivación desde las alertas anuladas
  const boundaries = [
    ...new Set(
      intento.alertasProctoring
        .filter((a) => a.estadoRevision === "ANULADA_FALSO_POSITIVO" && a.revisadoEn)
        .map((a) => new Date(a.revisadoEn!).getTime())
    ),
  ].sort((a, b) => a - b);

  // Determinar qué sesión mostrar
  let sessionIndex = 0;
  if (modo?.startsWith("session-")) {
    sessionIndex = parseInt(modo.replace("session-", ""), 10) || 0;
  } else if (modo === "original") {
    sessionIndex = 0;
  } else if (modo === "reactivado") {
    sessionIndex = boundaries.length > 0 ? boundaries.length : 0;
  }

  // Generar título de la carpeta
  let tituloCarpeta: string;
  if (sessionIndex === 0) {
    tituloCarpeta = "Intento 1";
  } else {
    tituloCarpeta = `Intento ${sessionIndex} (Reactivado)`;
  }

  // Filtrar evidencias según la sesión seleccionada
  let alertasProctoring = intento.alertasProctoring;
  if (boundaries.length > 0) {
    const start = sessionIndex === 0 ? null : boundaries[sessionIndex - 1];
    const end = sessionIndex < boundaries.length ? boundaries[sessionIndex] : null;

    alertasProctoring = intento.alertasProctoring.filter((a) => {
      const t = new Date(a.creadoEn).getTime();
      if (start !== null && t < start) return false;
      if (end !== null && t >= end) return false;
      return true;
    });
  }

  const isCurrentSession = boundaries.length === 0 || sessionIndex === boundaries.length;

  let estadoBadge = (
    <Badge variant="outline" className="bg-secondary text-muted-foreground">
      En Progreso
    </Badge>
  );

  if (!isCurrentSession) {
    estadoBadge = (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold px-3 py-1 text-xs">
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Reactivado por Profesor
      </Badge>
    );
  } else if (intento.estado === "PAUSADO_REVISION_IA") {
    estadoBadge = (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold px-3 py-1 text-xs">
        <AlertTriangle className="h-4 w-4 mr-1.5" />
        Examen Bloqueado (Pausado por IA)
      </Badge>
    );
  } else if (intento.estado === "CANCELADO_CONFIRMADO") {
    estadoBadge = (
      <Badge className="bg-destructive text-destructive-foreground font-bold px-3 py-1 text-xs">
        <XCircle className="h-4 w-4 mr-1.5" />
        Cancelado por Irregularidad Confirmada
      </Badge>
    );
  } else if (intento.estado === "REACTIVADO_POR_ADMIN") {
    estadoBadge = (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold px-3 py-1 text-xs">
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Reactivado por Profesor
      </Badge>
    );
  } else if (intento.estado === "ENVIADO" || intento.estado === "CALIFICADO") {
    estadoBadge = (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold px-3 py-1 text-xs">
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Examen Entregado (Con Advertencias)
      </Badge>
    );
  }

  const faltasValidasCount = intento.alertasProctoring.filter(
    (a) => a.nivelAlerta === "ALTO" && a.estadoRevision !== "ANULADA_FALSO_POSITIVO"
  ).length;

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div>
        <Button
          render={
            <Link
              href={`/admin/proctoring/${cuestionarioId}/${estudianteId}`}
            />
          }
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Carpetas del Alumno
        </Button>

        {/* Componente Resumen Limpio del Alumno e Intento */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                    <GraduationCap className="h-3.5 w-3.5 mr-1" />
                    {intento.cuestionario.grupo?.nombre ?? "Materia"}
                  </Badge>
                  <Badge variant="outline" className="bg-secondary text-foreground font-semibold text-xs">
                    {intento.cuestionario.titulo}
                  </Badge>
                  {estadoBadge}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2 flex-wrap">
                      <span>{intento.usuario.nombre}</span>
                      <span className="text-muted-foreground font-normal text-lg hidden sm:inline">•</span>
                      <span className="text-amber-500 font-extrabold text-xl">{tituloCarpeta}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">{intento.usuario.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Inicio: {new Date(intento.creadoEn).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Faltas acumuladas: {faltasValidasCount} / 2
                  </span>
                </div>
              </div>

              {/* Acciones del Profesor */}
              <div className="shrink-0 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6 flex flex-col gap-3">
                <ProctoringReviewActions
                  intentoId={intento.id}
                  estadoIntento={intento.estado}
                  disabled={!isCurrentSession}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Evidencias */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Evidencias Registradas ({alertasProctoring.length})
          </h2>
        </div>

        {!isCurrentSession && (
          <Card className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-xs font-semibold text-emerald-500">
                Esta carpeta corresponde a una sesión histórica que ya fue reactivada por el profesor. Las evidencias mostradas aquí ocasionaron el bloqueo de dicha sesión y se conservan como expediente histórico.
              </p>
            </CardContent>
          </Card>
        )}

        {alertasProctoring.length === 0 ? (
          <Card className="border border-dashed border-border/70 bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
              <h3 className="font-bold text-foreground">Sin evidencias en esta carpeta</h3>
              <p className="text-xs text-muted-foreground mt-1">
                No se registraron evidencias en esta sesión del examen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {alertasProctoring.map((alert) => {
              const isNoise = alert.tipoEvidencia === "GRABACION_RUIDO";
              const description = getAiDescription(alert.aiResultJson, isNoise);

              return (
                <Card
                  key={alert.id}
                  className="border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden"
                >
                  <CardHeader className="bg-secondary/30 pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {isNoise ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">
                            <Volume2 className="h-3.5 w-3.5 mr-1" />
                            Evidencia de Audio (Ruido)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">
                            <Camera className="h-3.5 w-3.5 mr-1" />
                            Captura de Cámara (Visual)
                          </Badge>
                        )}
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
                          Nivel {alert.nivelAlerta}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(alert.creadoEn).toLocaleString("es-MX", {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Evidencia Visual / Audio Player */}
                      <div className="rounded-2xl overflow-hidden border border-border/60 bg-black/40 p-2 flex flex-col items-center justify-center">
                        {isNoise ? (
                          <div className="w-full p-6 text-center space-y-4">
                            <Volume2 className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
                            <p className="text-xs font-semibold text-muted-foreground">
                              Grabación de evidencia de audio (+15 dB sostenido o ráfagas):
                            </p>
                            <audio
                              controls
                              src={`/api/proctoring/evidence/${alert.id}`}
                              className="w-full mt-2"
                            />
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`/api/proctoring/evidence/${alert.id}`}
                            alt="Evidencia visual"
                            className="w-full h-auto max-h-[300px] object-contain rounded-xl"
                          />
                        )}
                      </div>

                      {/* Detalles y Análisis */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">
                            {isNoise ? "Reporte de Análisis de Audio" : "Reporte de Inteligencia Artificial (Gemini)"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 bg-secondary/40 p-3 rounded-xl border border-border/40">
                            {description}
                          </p>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Modelo de Análisis:</span>
                            <span className="font-mono text-foreground">{alert.modelUsed}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Grado de Certeza:</span>
                            <span className="font-mono text-foreground">
                              {(alert.confianza * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Estado de Evaluación:</span>
                            <span className="font-bold text-foreground">
                              {alert.estadoRevision === "PENDIENTE"
                                ? "Pendiente de Dictamen"
                                : alert.estadoRevision === "CONFIRMADA"
                                ? "Irregularidad Confirmada"
                                : "Falso Positivo Anulado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
