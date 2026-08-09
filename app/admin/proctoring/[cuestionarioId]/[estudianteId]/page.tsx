import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  GraduationCap,
  Folder,
} from "lucide-react";

interface Props {
  params: Promise<{ cuestionarioId: string; estudianteId: string }>;
}

export const metadata = {
  title: "Carpetas de Intentos — Supervisión",
};

export default async function AdminProctoringEstudiantePage({ params }: Props) {
  const { cuestionarioId, estudianteId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const cuestionario = await prisma.cuestionario.findFirst({
    where: { id: cuestionarioId, adminId: user.id },
    select: {
      id: true,
      titulo: true,
      grupo: {
        select: {
          nombre: true,
        },
      },
    },
  });

  if (!cuestionario) notFound();

  const estudiante = await prisma.usuario.findUnique({
    where: { id: estudianteId },
    select: {
      id: true,
      nombre: true,
      email: true,
    },
  });

  if (!estudiante) notFound();

  // Buscar todos los intentos de este estudiante en este cuestionario
  const intentos = await prisma.intento.findMany({
    where: {
      cuestionarioId,
      usuarioId: estudianteId,
      OR: [
        { estado: "PAUSADO_REVISION_IA" },
        { estado: "CANCELADO_CONFIRMADO" },
        { estado: "REACTIVADO_POR_ADMIN" },
        { alertasProctoring: { some: {} } },
      ],
    },
    include: {
      alertasProctoring: {
        orderBy: { creadoEn: "desc" },
        select: {
          id: true,
          estadoRevision: true,
          creadoEn: true,
          revisadoEn: true,
        },
      },
    },
    orderBy: { creadoEn: "asc" },
  });

  // Generar las carpetas virtuales (separando intento original de reactivado para reflejar Google Drive)
  type FolderCardItem = {
    idKey: string;
    intentoId: string;
    label: string;
    modoParam?: string;
    alertasCount: number;
    alertasPendientes: number;
    ultimaEvidencia?: Date;
    estadoBadge: React.ReactNode;
  };

  const folderCards: FolderCardItem[] = [];

  intentos.forEach((intento, index) => {
    const numIntento = index + 1;

    // Obtener fronteras de reactivación: los distintos revisadoEn de alertas anuladas
    const boundaries = [
      ...new Set(
        intento.alertasProctoring
          .filter((a) => a.estadoRevision === "ANULADA_FALSO_POSITIVO" && a.revisadoEn)
          .map((a) => new Date(a.revisadoEn!).getTime())
      ),
    ].sort((a, b) => a - b);

    if (boundaries.length === 0) {
      // Sin reactivaciones — carpeta única normal
      const alertasPendientes = intento.alertasProctoring.filter(
        (a) => a.estadoRevision === "PENDIENTE"
      );
      const ultimaAlerta = intento.alertasProctoring[0];

      let estadoBadge = (
        <Badge variant="outline" className="bg-secondary text-muted-foreground">
          En Progreso
        </Badge>
      );

      if (intento.estado === "PAUSADO_REVISION_IA") {
        estadoBadge = (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
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
      } else if (intento.estado === "ENVIADO" || intento.estado === "CALIFICADO") {
        estadoBadge = (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Examen Entregado
          </Badge>
        );
      }

      folderCards.push({
        idKey: `${intento.id}-normal`,
        intentoId: intento.id,
        label: `Intento ${numIntento}`,
        alertasCount: intento.alertasProctoring.length,
        alertasPendientes: alertasPendientes.length,
        ultimaEvidencia: ultimaAlerta?.creadoEn ? new Date(ultimaAlerta.creadoEn) : undefined,
        estadoBadge,
      });
    } else {
      // Hay reactivaciones — crear carpeta por cada sesión
      // Sesión 0: alertas antes de la primera frontera → "Intento 1"
      // Sesión 1: alertas entre frontera 1 y 2 → "Intento 1 (Reactivado)"
      // Sesión 2: alertas entre frontera 2 y 3 → "Intento 2 (Reactivado)"
      // Sesión N: alertas después de la última frontera → sesión actual (pendientes)

      for (let i = 0; i <= boundaries.length; i++) {
        const start = i === 0 ? null : boundaries[i - 1];
        const end = i < boundaries.length ? boundaries[i] : null;

        const sessionAlertas = intento.alertasProctoring.filter((a) => {
          const t = new Date(a.creadoEn).getTime();
          if (start !== null && t < start) return false;
          if (end !== null && t >= end) return false;
          return true;
        });

        if (sessionAlertas.length === 0) continue;

        // Nomenclatura: Intento 1, Intento 1 (Reactivado), Intento 2 (Reactivado), ...
        const isOriginal = i === 0;
        const label = isOriginal
          ? `Intento ${numIntento}`
          : `Intento ${numIntento + i - 1} (Reactivado)`;
        const modoParam = `session-${i}`;

        // Determinar badge según si es sesión histórica o la actual
        const isCurrentSession = i === boundaries.length;
        let estadoBadge: React.ReactNode;

        if (!isCurrentSession) {
          // Sesión histórica (ya fue anulada/reactivada)
          estadoBadge = (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Examen Bloqueado (Pre-Reactivación)
            </Badge>
          );
        } else {
          // Sesión actual
          if (intento.estado === "PAUSADO_REVISION_IA") {
            estadoBadge = (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
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
          } else {
            estadoBadge = (
              <Badge variant="outline" className="bg-secondary text-muted-foreground">
                En Progreso
              </Badge>
            );
          }
        }

        folderCards.push({
          idKey: `${intento.id}-session-${i}`,
          intentoId: intento.id,
          label,
          modoParam,
          alertasCount: sessionAlertas.length,
          alertasPendientes: sessionAlertas.filter((a) => a.estadoRevision === "PENDIENTE").length,
          ultimaEvidencia: sessionAlertas[0]?.creadoEn ? new Date(sessionAlertas[0].creadoEn) : undefined,
          estadoBadge,
        });
      }
    }
  });

  const totalAlertas = intentos.reduce(
    (acc, cur) => acc + cur.alertasProctoring.length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div>
        <Button
          render={<Link href={`/admin/proctoring/${cuestionarioId}`} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Alumnos
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                <GraduationCap className="h-3.5 w-3.5 mr-1" />
                {cuestionario.grupo?.nombre ?? "Materia"}
              </Badge>
              <Badge variant="outline" className="bg-secondary text-foreground font-semibold text-xs">
                {cuestionario.titulo}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Carpetas de Intentos: {estudiante.nombre}
                </h1>
                <p className="text-xs text-muted-foreground">{estudiante.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm flex items-center gap-3">
            <span className="text-muted-foreground">Total evidencias en Drive:</span>
            <span className="font-bold text-amber-500 text-base">{totalAlertas}</span>
          </div>
        </div>
      </div>

      {folderCards.length === 0 ? (
        <Card className="border border-dashed border-border/70 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500/80" />
            <h2 className="text-lg font-bold text-foreground">
              Sin carpetas de intentos registradas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Este alumno no tiene intentos con alertas registradas en este cuestionario.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {folderCards.map((card) => {
            const queryParam = card.modoParam ? `?modo=${card.modoParam}` : "";

            return (
              <Card
                key={card.idKey}
                className="border border-border/60 hover:border-primary/40 bg-card/60 backdrop-blur-xl transition-all duration-200 shadow-sm"
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-extrabold text-foreground text-lg flex items-center gap-2">
                        <Folder className="h-5 w-5 text-amber-500" />
                        {card.label}
                      </span>
                      {card.estadoBadge}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        {card.alertasCount} {card.alertasCount === 1 ? "evidencia registrada" : "evidencias registradas"} (.jpg / .webm)
                      </span>

                      {card.alertasPendientes > 0 && (
                        <span className="font-bold text-amber-500">
                          ({card.alertasPendientes} pendiente{card.alertasPendientes > 1 ? "s" : ""} de revisión)
                        </span>
                      )}

                      {card.ultimaEvidencia && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Última evidencia: {card.ultimaEvidencia.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      render={
                        <Link
                          href={`/admin/proctoring/${cuestionarioId}/${estudianteId}/${card.intentoId}${queryParam}`}
                        />
                      }
                      nativeButton={false}
                      className="w-full sm:w-auto rounded-xl font-bold gap-1.5"
                    >
                      Ver Evidencias de {card.label}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
