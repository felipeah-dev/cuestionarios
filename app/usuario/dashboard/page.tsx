import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, ArrowRight, Clock, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsuarioDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalCuestionarios, totalIntentos, intentosRecientes] =
    await Promise.all([
      prisma.cuestionario.count(),
      prisma.intento.count({
        where: { usuarioId: user.id, estado: { in: ["ENVIADO", "CALIFICADO"] } },
      }),
      prisma.intento.findMany({
        where: { usuarioId: user.id },
        orderBy: { creadoEn: "desc" },
        take: 5,
        include: { cuestionario: true },
      }),
    ]);

  const estadoBadge = (estado: string) => {
    if (estado === "CALIFICADO")
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <Trophy className="h-3 w-3 mr-1" /> Calificado
        </Badge>
      );
    if (estado === "ENVIADO")
      return (
        <Badge className="bg-warning/10 text-warning border border-warning/20">
          <Clock className="h-3 w-3 mr-1" /> Pendiente
        </Badge>
      );
    return (
      <Badge className="bg-primary/10 text-primary border border-primary/20">
        En progreso
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 cursor-default">
            Portal del Estudiante
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Bienvenido de nuevo
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Revisa las evaluaciones disponibles, respóndelas y consulta tus
            calificaciones en tiempo real.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Cuestionarios Asignados
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalCuestionarios}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponibles para contestar
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Intentos Realizados
            </span>
            <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalIntentos}
            </div>
            <p className="text-xs text-muted-foreground">Exámenes enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* Intentos recientes */}
      {intentosRecientes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight">
            Intentos Recientes
          </h2>
          <div className="space-y-3">
            {intentosRecientes.map((intento: typeof intentosRecientes[number]) => (              <Card
                key={intento.id}
                className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {intento.cuestionario.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(intento.creadoEn).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {estadoBadge(intento.estado)}
                    {intento.estado === "CALIFICADO" && (
                      <span className="text-sm font-bold text-foreground">
                        {intento.calificacion?.toFixed(1)}
                        <span className="text-xs text-muted-foreground font-normal">
                          /100
                        </span>
                      </span>
                    )}
<Link href={`/usuario/cuestionarios/${intento.cuestionarioId}/resultado`} className="p-2 hover:bg-muted rounded-md transition-colors">
  <ArrowRight className="h-4 w-4" />
</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Acceso rápido */}
      <Card className="border border-border/60 bg-card shadow-sm group hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              Ir a mis Cuestionarios
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ver todas las evaluaciones disponibles para ti
            </p>
          </div>
<Link
  href="/usuario/cuestionarios"
  className="shrink-0 p-2 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
>
  <ArrowRight className="h-4 w-4" />
</Link>
        </CardContent>
      </Card>
    </div>
  );
}