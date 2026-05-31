import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ArrowLeft, Trophy } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultadoCuestionarioPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) notFound();

  const intento = await prisma.intento.findFirst({
    where: {
      cuestionarioId: id,
      usuarioId: user.id,
    },
    orderBy: { creadoEn: "desc" },
    include: {
      cuestionario: true,
      respuestas: {
        include: {
          pregunta: {
            include: { opciones: true },
          },
          opcion: true,
        },
      },
    },
  });

  if (!intento) notFound();

  const estaCalificado = intento.estado === "CALIFICADO";
  const estaEnviado = intento.estado === "ENVIADO";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
<Button variant="ghost" size="icon" render={<Link href="/usuario/cuestionarios" />}>
  <ArrowLeft className="h-4 w-4" />
</Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Resultado del Intento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {intento.cuestionario.titulo}
          </p>
        </div>
      </div>

      {/* Estado ENVIADO - pendiente */}
      {estaEnviado && (
        <Card className="border border-warning/40 bg-warning/10">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Pendiente de calificación
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tu examen fue enviado correctamente. El administrador revisará
                tus respuestas abiertas y publicará tu calificación final pronto.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado CALIFICADO - calificación final */}
      {estaCalificado && (
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-6 p-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                Calificación Final
              </p>
              <p className="text-5xl font-extrabold tracking-tight text-foreground">
                {intento.calificacion?.toFixed(1)}
                <span className="text-xl text-muted-foreground font-normal ml-1">
                  / 100
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revisión de respuestas */}
      {estaCalificado && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            Revisión de Respuestas
          </h2>
          {intento.respuestas.map((respuesta: typeof intento.respuestas[number]) => {            const pregunta = respuesta.pregunta;
            const esAbierta = pregunta.tipo === "ABIERTA";
            const esCorrecta =
              !esAbierta &&
              respuesta.opcion?.esCorrecta === true;
            const pendiente =
              esAbierta && respuesta.puntajeObtenido === null;

            let borderClass = "border-warning bg-warning/10";
            if (!esAbierta) {
              borderClass = esCorrecta
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-destructive bg-destructive/10";
            } else if (!pendiente) {
              borderClass =
                (respuesta.puntajeObtenido ?? 0) > 0
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-destructive bg-destructive/10";
            }

            return (
              <Card
                key={respuesta.id}
                className={`border-2 ${borderClass}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold">
                      {pregunta.texto}
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      {!esAbierta && (
                        esCorrecta ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )
                      )}
                      {esAbierta && pendiente && (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {respuesta.puntajeObtenido ?? 0} / {pregunta.puntos} pts
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {esAbierta ? (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                        Tu respuesta
                      </p>
                      <p className="text-foreground">
                        {respuesta.respuestaAbierta ?? "Sin respuesta"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {pregunta.opciones.map((opcion: typeof pregunta.opciones[number]) => {                        const esLaElegida = opcion.id === respuesta.opcionId;
                        const esLaCorrecta = opcion.esCorrecta;
                        let opcionClass = "text-muted-foreground";
                        if (esLaElegida && esLaCorrecta)
                          opcionClass = "text-emerald-500 font-semibold";
                        if (esLaElegida && !esLaCorrecta)
                          opcionClass = "text-destructive font-semibold";
                        if (!esLaElegida && esLaCorrecta)
                          opcionClass = "text-emerald-500";
                        return (
                          <div
                            key={opcion.id}
                            className={`flex items-center gap-2 ${opcionClass}`}
                          >
                            <span>
                              {esLaElegida ? "→" : esLaCorrecta ? "✓" : "○"}
                            </span>
                            <span>{opcion.texto}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
