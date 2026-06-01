import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  CheckCircle,
  TrendingUp,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [totalCuestionarios, calificacionesPendientes, intentosCompletados] =
    await Promise.all([
      prisma.cuestionario.count({
        where: { adminId: user.id },
      }),
      prisma.intento.count({
        where: {
          estado: "ENVIADO",
          cuestionario: { adminId: user.id },
        },
      }),
      prisma.intento.count({
        where: {
          estado: { in: ["ENVIADO", "CALIFICADO"] },
          cuestionario: { adminId: user.id },
        },
      }),
    ]);

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="space-y-3">
            <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 cursor-default">
              Panel Administrativo
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Bienvenido, {user.name}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Gestiona evaluaciones, revisa el rendimiento de los alumnos y califica
              respuestas abiertas desde aquí.
            </p>
          </div>
          <Button
            render={<Link href="/admin/cuestionarios/nuevo" />}
            nativeButton={false}
            className="shrink-0 shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo Cuestionario
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Cuestionarios Creados
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalCuestionarios}
            </div>
            <p className="text-xs text-muted-foreground">Activos en la plataforma</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Calificaciones Pendientes
            </span>
            <div className="h-8 w-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {calificacionesPendientes}
            </div>
            <p className="text-xs text-muted-foreground">Respuestas por evaluar</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Intentos Completados
            </span>
            <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {intentosCompletados}
            </div>
            <p className="text-xs text-muted-foreground">Exámenes entregados</p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border border-border/60 bg-card shadow-sm group hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Administrar Cuestionarios</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crea, edita y gestiona evaluaciones
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              render={<Link href="/admin/cuestionarios" />}
              nativeButton={false}
              className="shrink-0 group-hover:text-primary group-hover:bg-primary/10 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm group hover:border-success/30 hover:shadow-md transition-all duration-200 cursor-pointer">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Ver Reportes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estadísticas y calificaciones globales
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              render={<Link href="/admin/reportes" />}
              nativeButton={false}
              className="shrink-0 group-hover:text-success group-hover:bg-success/10 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
