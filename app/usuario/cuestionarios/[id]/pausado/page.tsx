import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isActiveAttemptStatus } from "@/lib/quiz-rules";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Examen en revision",
};

export default async function IntentoPausadoPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const intento = await prisma.intento.findFirst({
    where: { cuestionarioId: id, usuarioId: user.id },
    orderBy: { creadoEn: "desc" },
    include: {
      cuestionario: true,
      alertasProctoring: {
        where: { estadoRevision: "PENDIENTE" },
        orderBy: { creadoEn: "desc" },
        take: 1,
        select: { creadoEn: true, nivelAlerta: true },
      },
    },
  });

  if (!intento) redirect("/usuario/cuestionarios");

  if (isActiveAttemptStatus(intento.estado)) {
    redirect(`/usuario/cuestionarios/${id}`);
  }

  if (intento.estado === "ENVIADO" || intento.estado === "CALIFICADO") {
    redirect(`/usuario/cuestionarios/${id}/resultado`);
  }

  const latestAlert = intento.alertasProctoring[0];

  return (
    <div className="mx-auto max-w-3xl py-10">
      <Card className="border border-warning/40 bg-warning/10 shadow-lg">
        <CardContent className="p-8 sm:p-10 text-center space-y-7">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-warning/40 bg-background/80 text-warning">
            <ShieldAlert className="h-10 w-10" />
          </div>

          <div className="space-y-3">
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
              Revision pendiente
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Tu examen fue pausado para revision
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground">
              El sistema detecto una posible irregularidad durante el examen.
              La evidencia sera revisada por un administrador o profesor. Si se
              determina que fue un error, tu intento podra ser reactivado.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/60 p-5 text-left sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Cuestionario
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {intento.cuestionario.titulo}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Estado
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {intento.estado === "CANCELADO_CONFIRMADO"
                  ? "Cancelado por revision"
                  : "Pausado temporalmente"}
              </p>
            </div>
            {latestAlert && (
              <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-warning" />
                Alerta generada el{" "}
                {new Date(latestAlert.creadoEn).toLocaleString("es-MX", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            )}
          </div>

          {intento.estado === "CANCELADO_CONFIRMADO" ? (
            <Button render={<Link href={`/usuario/cuestionarios/${id}/resultado`} />} nativeButton={false} className="rounded-xl">
              Ver resultado
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Espera a que un administrador revise la evidencia.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
