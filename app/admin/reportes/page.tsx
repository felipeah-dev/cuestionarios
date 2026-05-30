import { BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getReportsDataAction } from "./_actions";
import { ReportesChart } from "./_components/ReportesChart";

export default async function AdminReportesPage() {
  const data = await getReportsDataAction();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 cursor-default">
            Reportes
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Calificaciones por Cuestionario
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Comparativa de calificación máxima y mínima por cuestionario. Solo
            considera intentos con estado{" "}
            <span className="font-semibold text-foreground">Calificado</span>.
          </p>
        </div>
      </div>

      {/* Gráfica o estado vacío */}
      {data.length === 0 ? (
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
              <BarChart2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Sin datos todavía
              </p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                No hay intentos calificados. Cuando los administradores
                califiquen cuestionarios, los resultados aparecerán aquí.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Comparativa por Cuestionario
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.length}{" "}
                  {data.length === 1
                    ? "cuestionario con intentos calificados"
                    : "cuestionarios con intentos calificados"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ReportesChart data={data} />
          </CardContent>
        </Card>
      )}

      {/* Tabla resumen */}
      {data.length > 0 && (
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-0">
            <p className="text-sm font-semibold text-foreground">
              Resumen detallado
            </p>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="divide-y divide-border">
              {data.map((item) => (
                <div
                  key={item.cuestionarioId}
                  className="flex items-center justify-between py-3 gap-4"
                >
                  <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                    {item.titulo}
                  </p>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success inline-block shrink-0" />
                      Máx:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {item.maxima.toFixed(1)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-destructive inline-block shrink-0" />
                      Mín:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {item.minima.toFixed(1)}
                      </span>
                    </span>
                    <span className="hidden sm:inline">
                      {item.totalIntentos}{" "}
                      {item.totalIntentos === 1 ? "intento" : "intentos"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
