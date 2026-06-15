import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Award, Calendar, ChevronRight, Clock } from "lucide-react";
import {
  clampPercentage,
  formatDuration,
  getQuizEstimatedMinutes,
} from "@/lib/quiz-rules";

export const metadata = {
  title: "Cuestionarios Disponibles — Portal Académico",
  description: "Lista de evaluaciones académicas disponibles para responder.",
};

export default async function UsuarioCuestionariosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch all questionnaires along with their questions and the current user's attempts in parallel
  const cuestionarios = await prisma.cuestionario.findMany({
    include: {
      preguntas: {
        orderBy: { orden: "asc" },
      },
      intentos: {
        where: { usuarioId: user.id },
        orderBy: { creadoEn: "desc" },
        include: {
          _count: {
            select: { respuestas: true },
          },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent sm:text-5xl">
          Evaluaciones Disponibles
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
          Responde tus exámenes asignados, revisa tu progreso y visualiza tus calificaciones al instante.
        </p>
      </div>

      {cuestionarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl bg-card/30 backdrop-blur-sm text-center">
          <FileText className="h-12 w-12 text-muted-foreground/60 mb-4 stroke-1.5" />
          <h3 className="text-lg font-bold">No hay cuestionarios disponibles</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md">
            Tu docente aún no ha publicado evaluaciones. Cuando lo haga, aparecerán en esta sección.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cuestionarios.map((c) => {
            const ultimoIntento = c.intentos[0];
            const intentoRealmenteIniciado =
              !!ultimoIntento &&
              (ultimoIntento.estado !== "EN_PROGRESO" ||
                ultimoIntento._count.respuestas > 0);
            const totalPreguntas = c.preguntas.length;
            const puntosTotales = c.preguntas.reduce((acc, p) => acc + p.puntos, 0);
            const duracionEstimada = getQuizEstimatedMinutes(c.preguntas);

            let statusBadge = <Badge variant="secondary" className="font-semibold text-xs py-0.5 px-2 bg-secondary/80">Sin Iniciar</Badge>;
            let actionButton = (
              <Button render={<Link href={`/usuario/cuestionarios/${c.id}`} />} nativeButton={false} className="w-full group shadow-md shadow-primary/10 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 font-bold">
                Iniciar Cuestionario
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            );

            if (ultimoIntento && intentoRealmenteIniciado) {
              if (ultimoIntento.estado === "EN_PROGRESO") {
                statusBadge = (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold text-xs py-0.5 px-2">
                    En Progreso
                  </Badge>
                );
                actionButton = (
                  <Button render={<Link href={`/usuario/cuestionarios/${c.id}`} />} nativeButton={false} className="w-full bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/10 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 font-bold text-white">
                    Continuar Intento
                    <Clock className="h-4 w-4" />
                  </Button>
                );
              } else if (ultimoIntento.estado === "ENVIADO") {
                statusBadge = (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-xs py-0.5 px-2">
                    Enviado
                  </Badge>
                );
                actionButton = (
                  <Button render={<Link href={`/usuario/cuestionarios/${c.id}/resultado`} />} nativeButton={false} variant="secondary" className="w-full rounded-xl border border-border/80 hover:bg-secondary/80 cursor-pointer flex items-center justify-center gap-1.5 font-bold text-foreground">
                    Ver Respuestas
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                );
              } else if (ultimoIntento.estado === "CALIFICADO") {
                const calificacion = clampPercentage(ultimoIntento.calificacion ?? 0);
                const califColor =
                  calificacion >= 70
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : calificacion >= 50
                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    : "text-destructive bg-destructive/10 border-destructive/20";

                statusBadge = (
                  <Badge className={`border font-bold text-xs py-0.5 px-2 ${califColor}`}>
                    Nota: {calificacion.toFixed(0)}/100
                  </Badge>
                );
                actionButton = (
                  <Button render={<Link href={`/usuario/cuestionarios/${c.id}/resultado`} />} nativeButton={false} variant="outline" className="w-full border-primary/20 hover:border-primary/50 text-foreground rounded-xl cursor-pointer flex items-center justify-center gap-1.5 font-bold">
                    Ver Resultados
                    <Award className="h-4 w-4 text-primary" />
                  </Button>
                );
              }
            }

            return (
              <Card
                key={c.id}
                className="relative flex flex-col justify-between border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-xl group overflow-hidden"
              >
                {/* Visual top gradient line */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/20 to-primary/0 group-hover:from-primary group-hover:to-violet-500 transition-all duration-500" />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    {statusBadge}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(c.creadoEn).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors duration-300">
                    {c.titulo}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                    {c.descripcion || "Sin descripción proporcionada."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-3 py-3 px-4 rounded-xl bg-secondary/40 border border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Preguntas</span>
                      <span className="font-bold text-sm text-foreground">{totalPreguntas} reactivos</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Valor</span>
                      <span className="font-bold text-sm text-foreground">{puntosTotales}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Duracion</span>
                      <span className="font-bold text-sm text-foreground">
                        {formatDuration(duracionEstimada)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto">{actionButton}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

