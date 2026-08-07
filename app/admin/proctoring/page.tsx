import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  FileText,
  Users,
  ChevronRight,
  AlertTriangle,
  GraduationCap,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Supervisión de Cuestionarios — Proctoring IA",
};

export default async function AdminProctoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  // Obtener cuestionarios del profesor que tienen actividad de supervisión (intentos o alertas)
  const cuestionarios = await prisma.cuestionario.findMany({
    where: {
      adminId: user.id,
      intentos: {
        some: {
          OR: [
            { estado: "PAUSADO_REVISION_IA" },
            { estado: "CANCELADO_CONFIRMADO" },
            { estado: "REACTIVADO_POR_ADMIN" },
            { alertasProctoring: { some: {} } },
          ],
        },
      },
    },
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
      intentos: {
        where: {
          OR: [
            { estado: "PAUSADO_REVISION_IA" },
            { estado: "CANCELADO_CONFIRMADO" },
            { estado: "REACTIVADO_POR_ADMIN" },
            { alertasProctoring: { some: {} } },
          ],
        },
        select: {
          id: true,
          usuarioId: true,
          estado: true,
          alertasProctoring: {
            select: {
              id: true,
              estadoRevision: true,
              nivelAlerta: true,
            },
          },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border/40 pb-6">
        <div>
          <Badge className="mb-3 border border-primary/20 bg-primary/10 text-primary font-semibold">
            Supervisión
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Cuestionarios con Supervisión
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Selecciona un cuestionario para revisar las incidencias detectadas y gestionar las revisiones de los alumnos.
          </p>
        </div>
      </div>

      {cuestionarios.length === 0 ? (
        <Card className="border border-dashed border-border/70 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground/60" />
            <h2 className="text-lg font-bold text-foreground">
              Sin incidencias de supervisión
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Cuando los alumnos realicen cuestionarios y Gemini o el detector de ruido registren incidencias, tus cuestionarios aparecerán aquí organizados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cuestionarios.map((c) => {
            // Métricas por cuestionario
            const estudiantesUnicos = new Set(c.intentos.map((i) => i.usuarioId)).size;
            const totalAlertas = c.intentos.flatMap((i) => i.alertasProctoring).length;
            const pendientesCount = c.intentos.flatMap((i) => i.alertasProctoring).filter((a) => a.estadoRevision === "PENDIENTE").length;
            const pausadosCount = c.intentos.filter((i) => i.estado === "PAUSADO_REVISION_IA").length;

            return (
              <Card
                key={c.id}
                className="relative flex flex-col justify-between border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-xl group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/30 to-primary/0 group-hover:from-primary group-hover:to-amber-500 transition-all duration-500" />

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="bg-secondary/60 text-muted-foreground border-border/60 text-[11px] font-bold">
                      <GraduationCap className="h-3 w-3 mr-1 text-primary" />
                      {c.grupo?.nombre ?? "Sin Materia"}
                    </Badge>
                    {pausadosCount > 0 ? (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold text-[11px] py-0.5 px-2">
                        <AlertTriangle className="h-3 w-3 mr-1 text-destructive" />
                        {pausadosCount} Pausado{pausadosCount > 1 ? "s" : ""}
                      </Badge>
                    ) : pendientesCount > 0 ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold text-[11px] py-0.5 px-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {pendientesCount} Pendiente{pendientesCount > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[11px] py-0.5 px-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Revisado
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {c.titulo}
                  </CardTitle>
                  {c.descripcion && (
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {c.descripcion}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-5 flex-1 flex flex-col justify-between pt-2">
                  <div className="grid grid-cols-2 gap-3 py-3 px-4 rounded-xl bg-secondary/40 border border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Alumnos con Incidencias</span>
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {estudiantesUnicos} {estudiantesUnicos === 1 ? "alumno" : "alumnos"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">
                        {pendientesCount > 0 ? "Por Revisar" : "Total Incidencias"}
                      </span>
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <ShieldAlert className={`h-3.5 w-3.5 ${pendientesCount > 0 ? "text-amber-500" : "text-primary"}`} />
                        {pendientesCount > 0
                          ? `${pendientesCount} pendiente${pendientesCount > 1 ? "s" : ""}`
                          : `${totalAlertas} registrada${totalAlertas !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <Button
                      render={<Link href={`/admin/proctoring/${c.id}`} />}
                      nativeButton={false}
                      className="w-full group shadow-md shadow-primary/10 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                    >
                      Ver Alumnos con Incidencias
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
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
