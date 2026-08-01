import { redirect } from "next/navigation";
import { AlertTriangle, ShieldAlert, UserCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProctoringReviewActions } from "./_components/ProctoringReviewActions";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Alertas de Proctoring",
};

const alertLevelConfig = {
  BAJO: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  MEDIO: "border-warning/30 bg-warning/10 text-warning",
  ALTO: "border-destructive/30 bg-destructive/10 text-destructive",
} as const;

const reviewStatusConfig = {
  PENDIENTE: "border-warning/30 bg-warning/10 text-warning",
  CONFIRMADA: "border-destructive/30 bg-destructive/10 text-destructive",
  ANULADA_FALSO_POSITIVO:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  ERROR_IA: "border-border bg-muted text-muted-foreground",
} as const;

export default async function AdminProctoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const alerts = await prisma.alertaProctoring.findMany({
    where: {
      intento: {
        cuestionario: {
          adminId: user.id,
        },
      },
    },
    orderBy: { creadoEn: "desc" },
    take: 50,
    include: {
      estudiante: { select: { nombre: true, email: true } },
      revisadoPor: { select: { nombre: true } },
      intento: {
        select: {
          id: true,
          estado: true,
          cuestionario: { select: { titulo: true } },
        },
      },
    },
  });

  const pendingCount = alerts.filter((alert) => alert.estadoRevision === "PENDIENTE").length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="mb-3 border border-primary/20 bg-primary/10 text-primary">
            Proctoring IA
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Alertas de supervision
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Revisa evidencia generada por IA y decide si se confirma una
            irregularidad o si fue un falso positivo.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm">
          <span className="font-bold text-foreground">{pendingCount}</span>{" "}
          <span className="text-muted-foreground">pendientes</span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="border border-dashed border-border/70 bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">
              Sin alertas de proctoring
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando Gemini detecte una posible irregularidad, aparecera aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5">
          {alerts.map((alert) => {
            const description = getAiDescription(alert.aiResultJson);
            const isPending = alert.estadoRevision === "PENDIENTE";

            return (
              <Card
                key={alert.id}
                className="overflow-hidden border border-border/60 bg-card/70 shadow-sm"
              >
                <CardHeader className="border-b border-border/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border font-bold",
                            alertLevelConfig[alert.nivelAlerta]
                          )}
                        >
                          {alert.nivelAlerta}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border font-bold",
                            reviewStatusConfig[alert.estadoRevision]
                          )}
                        >
                          {alert.estadoRevision.replaceAll("_", " ")}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground">
                          Confianza {(alert.confianza * 100).toFixed(0)}%
                        </span>
                      </div>
                      <CardTitle className="mt-3 text-xl font-bold text-foreground">
                        {alert.intento.cuestionario.titulo}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.estudiante.nombre} - {alert.estudiante.email}
                      </p>
                    </div>

                    {isPending ? (
                      <ProctoringReviewActions alertId={alert.id} />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCheck className="h-4 w-4" />
                        Revisado por {alert.revisadoPor?.nombre ?? "admin"}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 lg:grid-cols-[320px_1fr]">
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/proctoring/evidence/${alert.id}`}
                      alt="Evidencia de proctoring"
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Descripcion IA
                      </p>
                      <p className="mt-1 rounded-xl border border-border/50 bg-background/50 p-4 text-sm leading-6 text-foreground">
                        {description}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <Info label="Intento" value={alert.intento.id} />
                      <Info label="Estado intento" value={alert.intento.estado} />
                      <Info
                        label="Fecha alerta"
                        value={new Date(alert.creadoEn).toLocaleString("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      />
                      <Info label="Modelo" value={alert.modelUsed} />
                    </div>
                    {alert.estadoRevision === "ERROR_IA" && (
                      <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Gemini no devolvio una respuesta valida. No se pauso el
                        examen automaticamente por esta alerta tecnica.
                      </div>
                    )}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function getAiDescription(value: Prisma.JsonValue) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const description = value.descripcion_breve;
    if (typeof description === "string") return description;
    const message = value.message;
    if (typeof message === "string") return message;
  }

  return "Sin descripcion disponible.";
}
