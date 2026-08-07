import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";

interface Props {
  params: Promise<{ cuestionarioId: string }>;
}

export const metadata = {
  title: "Alumnos con Incidencias — Proctoring",
};

export default async function AdminProctoringCuestionarioPage({ params }: Props) {
  const { cuestionarioId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const cuestionario = await prisma.cuestionario.findFirst({
    where: { id: cuestionarioId, adminId: user.id },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      grupo: {
        select: {
          nombre: true,
          codigo: true,
        },
      },
    },
  });

  if (!cuestionario) notFound();

  // Buscar intentos de este cuestionario que registraron incidencias o estados especiales
  const intentos = await prisma.intento.findMany({
    where: {
      cuestionarioId,
      OR: [
        { estado: "PAUSADO_REVISION_IA" },
        { estado: "CANCELADO_CONFIRMADO" },
        { estado: "REACTIVADO_POR_ADMIN" },
        { alertasProctoring: { some: {} } },
      ],
    },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      alertasProctoring: {
        orderBy: { creadoEn: "desc" },
        select: {
          id: true,
          nivelAlerta: true,
          confianza: true,
          estadoRevision: true,
          tipoEvidencia: true,
          creadoEn: true,
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div>
        <Button
          render={<Link href="/admin/proctoring" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Cuestionarios
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                <GraduationCap className="h-3.5 w-3.5 mr-1" />
                {cuestionario.grupo?.nombre ?? "Materia"}
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {cuestionario.titulo}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Alumnos que registraron incidencias o interrupciones durante este cuestionario.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm flex items-center gap-3">
            <span className="text-muted-foreground">Total alumnos en revisión:</span>
            <span className="font-bold text-foreground text-base">{intentos.length}</span>
          </div>
        </div>
      </div>

      {intentos.length === 0 ? (
        <Card className="border border-dashed border-border/70 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500/80" />
            <h2 className="text-lg font-bold text-foreground">
              Sin alumnos con incidencias
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ningún alumno ha registrado alertas graves o bloqueos en este cuestionario.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {intentos.map((intento) => {
            const alertasPendientes = intento.alertasProctoring.filter((a) => a.estadoRevision === "PENDIENTE");
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
            } else if (intento.estado === "REACTIVADO_POR_ADMIN") {
              estadoBadge = (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reactivado por Profesor
                </Badge>
              );
            }

            return (
              <Card
                key={intento.id}
                className="border border-border/60 hover:border-primary/40 bg-card/60 backdrop-blur-xl transition-all duration-200"
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-base leading-snug">
                            {intento.usuario.nombre}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {intento.usuario.email}
                          </p>
                        </div>
                      </div>
                      {estadoBadge}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        {intento.alertasProctoring.length} {intento.alertasProctoring.length === 1 ? "incidencia registrada" : "incidencias registradas"}
                      </span>
                      {alertasPendientes.length > 0 && (
                        <span className="font-bold text-amber-500">
                          ({alertasPendientes.length} pendiente{alertasPendientes.length > 1 ? "s" : ""} de revisión)
                        </span>
                      )}
                      {ultimaAlerta && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Última evidencia: {new Date(ultimaAlerta.creadoEn).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      render={<Link href={`/admin/proctoring/${cuestionarioId}/${intento.id}`} />}
                      nativeButton={false}
                      className="w-full md:w-auto rounded-xl font-bold gap-1.5"
                    >
                      Ver Evidencias e Incidencias
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
