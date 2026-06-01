import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ClipboardList, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

const estadoConfig = {
  CALIFICADO: { label: "Calificado", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" },
  ENVIADO:    { label: "Pendiente",  className: "border-amber-500/40 bg-amber-500/10 text-amber-600" },
  EN_PROGRESO:{ label: "En progreso",className: "border-border bg-muted text-muted-foreground" },
} as const;

export default async function IntentosCuestionarioPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.rol !== "ADMIN") redirect("/usuario/dashboard");

  const cuestionario = await prisma.cuestionario.findFirst({
    where: { id, adminId: user.id },
  });
  if (!cuestionario) notFound();

  const intentos = await prisma.intento.findMany({
    where: { cuestionarioId: id },
    include: {
      usuario: { select: { nombre: true, email: true } },
    },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/cuestionarios"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Cuestionarios
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Intentos de alumnos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{cuestionario.titulo}</p>
        </div>
      </div>

      {intentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Sin intentos todavía</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ningún alumno ha iniciado este cuestionario.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Alumno</TableHead>
                <TableHead className="font-semibold">Correo</TableHead>
                <TableHead className="font-semibold text-center">Estado</TableHead>
                <TableHead className="font-semibold text-center">Calificación</TableHead>
                <TableHead className="font-semibold">Enviado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intentos.map((intento) => {
                const config = estadoConfig[intento.estado];
                const puedeCalificar =
                  intento.estado === "ENVIADO" || intento.estado === "CALIFICADO";

                return (
                  <TableRow key={intento.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      {intento.usuario.nombre}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {intento.usuario.email}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("border font-semibold", config.className)}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {intento.calificacion !== null
                        ? `${intento.calificacion.toFixed(1)} / 100`
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {intento.enviadoEn
                        ? new Date(intento.enviadoEn).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {puedeCalificar ? (
                        <Link
                          href={`/admin/cuestionarios/${intento.id}/calificar`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Calificar
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">En progreso</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
