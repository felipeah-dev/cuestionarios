import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProctoringReviewActions } from "../../_components/ProctoringReviewActions";
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
} from "lucide-react";

interface Props {
  params: Promise<{ cuestionarioId: string; intentoId: string }>;
}

export const metadata = {
  title: "Detalle de Incidencias de Alumno — Proctoring",
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
  if (
    typeof json === "object" &&
    json !== null &&
    "detalles" in json &&
    typeof (json as Record<string, unknown>).detalles === "string"
  ) {
    return (json as Record<string, unknown>).detalles as string;
  }
  if (isNoise) {
    return "Se detectó ruido excesivo o habla continua en el micrófono (+15 dB sobre el nivel base de silencio).";
  }
  return "Sin descripción detallada";
}

export default async function AdminProctoringIntentoDetallePage({ params }: Props) {
  const { cuestionarioId, intentoId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const intento = await prisma.intento.findFirst({
    where: {
      id: intentoId,
      cuestionarioId,
      cuestionario: { adminId: user.id },
    },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      cuestionario: {
        select: {
          id: true,
          titulo: true,
          grupo: { select: { nombre: true } },
        },
      },
      alertasProctoring: {
        orderBy: { creadoEn: "desc" },
        include: {
          revisadoPor: { select: { nombre: true } },
        },
      },
    },
  });

  if (!intento) notFound();

  let estadoBadge = (
    <Badge variant="outline" className="bg-secondary text-muted-foreground">
      En Progreso
    </Badge>
  );

  if (intento.estado === "PAUSADO_REVISION_IA") {
    estadoBadge = (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
        <AlertTriangle className="h-3.5 w-3.5 mr-1 text-destructive" />
        Examen Bloqueado (Pausado por IA)
      </Badge>
    );
  } else if (intento.estado === "CANCELADO_CONFIRMADO") {
    estadoBadge = (
      <Badge className="bg-destructive text-destructive-foreground font-bold">
        <XCircle className="h-3.5 w-3.5 mr-1" />
        Cancelado por Irregularidad
      </Badge>
    );
  } else if (intento.estado === "REACTIVADO_POR_ADMIN") {
    estadoBadge = (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">
        <RotateCcw className="h-3.5 w-3.5 mr-1" />
        Reactivado por Profesor
      </Badge>
    );
  } else if (intento.estado === "ENVIADO" || intento.estado === "CALIFICADO") {
    estadoBadge = (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        Examen Entregado (Con Advertencia)
      </Badge>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation & Student Header Card */}
      <div>
        <Button
          render={<Link href={`/admin/proctoring/${cuestionarioId}`} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Lista de Alumnos
        </Button>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-2xl font-extrabold text-foreground">
                      {intento.usuario.nombre}
                    </h1>
                    {estadoBadge}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {intento.usuario.email} • Cuestionario: <span className="font-semibold text-foreground">{intento.cuestionario.titulo}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-border/60 bg-secondary/40 text-muted-foreground px-3 py-1.5 text-xs font-semibold">
                  <GraduationCap className="h-3.5 w-3.5 mr-1 text-primary" />
                  {intento.cuestionario.grupo?.nombre ?? "Materia"}
                </Badge>
              </div>
            </div>

            {/* Decision Global para el Examen / Intento del Alumno */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/60 bg-secondary/30">
              <div>
                <span className="text-xs font-bold text-foreground block mb-0.5">
                  Decisión de Revisión del Examen
                </span>
                <p className="text-xs text-muted-foreground">
                  Revisa las evidencias abajo y decide si reactivas el examen o si confirmas la falta para cancelarlo.
                </p>
              </div>

              <ProctoringReviewActions
                intentoId={intento.id}
                estadoIntento={intento.estado}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seccion de Evidencias de Incidencias */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Evidencias de Incidencias Registradas ({intento.alertasProctoring.length})
          </h2>
        </div>

        {intento.alertasProctoring.length === 0 ? (
          <Card className="border border-dashed border-border/70 bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
              <h3 className="font-bold text-foreground">Sin evidencias de faltas graves</h3>
              <p className="text-xs text-muted-foreground mt-1">
                No se registraron alertas de nivel alto ni evidencias de ruido sostenido para este intento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {intento.alertasProctoring.map((alert) => {
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

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(alert.creadoEn).toLocaleString("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })}
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
                              className="w-full rounded-xl"
                              src={`/api/proctoring/evidence/${alert.id}`}
                            />
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`/api/proctoring/evidence/${alert.id}`}
                            alt="Evidencia de proctoring"
                            className="max-h-72 w-auto object-contain rounded-xl shadow-md"
                          />
                        )}
                      </div>

                      {/* Detalles del Análisis */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                            Motivo / Descripción de la Incidencia
                          </span>
                          <p className="text-base font-semibold text-foreground leading-relaxed p-4 rounded-xl border border-border/60 bg-secondary/30">
                            {description}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl border border-border/40 bg-card/40">
                            <span className="text-muted-foreground block mb-0.5">Confianza de IA</span>
                            <span className="font-bold text-foreground text-sm">
                              {Math.round(alert.confianza * 100)}%
                            </span>
                          </div>
                          <div className="p-3 rounded-xl border border-border/40 bg-card/40">
                            <span className="text-muted-foreground block mb-0.5">Tipo de Evidencia</span>
                            <span className="font-bold text-foreground text-sm">
                              {isNoise ? "Audio (.webm)" : "Foto JPEG"}
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
