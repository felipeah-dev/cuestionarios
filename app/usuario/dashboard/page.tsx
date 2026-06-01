import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function UsuarioDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Get total questionnaires in DB
  const totalCuestionarios = await prisma.cuestionario.count();

  // Get completed attempts (submitted or graded) for this user
  const intentosRealizados = await prisma.intento.count({
    where: {
      usuarioId: user.id,
      estado: {
        in: ["ENVIADO", "CALIFICADO"],
      },
    },
  });

  // Available questionnaires = total - completed
  const disponiblesParaContestar = Math.max(0, totalCuestionarios - intentosRealizados);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 cursor-default">
            Portal del Estudiante
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Bienvenido, {user.name}
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
              {disponiblesParaContestar}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles para contestar</p>
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
              {intentosRealizados}
            </div>
            <p className="text-xs text-muted-foreground">Exámenes enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* Acceso rápido */}
      <Card className="border border-border/60 bg-card shadow-sm group hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">Ir a mis Cuestionarios</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ver todas las evaluaciones disponibles para ti
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/usuario/cuestionarios" />}
            nativeButton={false}
            className="shrink-0 group-hover:text-primary group-hover:bg-primary/10 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
