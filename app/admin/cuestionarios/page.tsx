import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccionesRow } from "./_components/AccionesRow";
import { listarCuestionarios } from "./_actions";
import type { CuestionarioListItem } from "./_actions";
import { Plus, BookOpen, Users } from "lucide-react";

export default async function AdminCuestionariosPage() {
  const cuestionarios = await listarCuestionarios();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Mis cuestionarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cuestionarios.length === 0
              ? "Aún no has creado ningún cuestionario."
              : `${cuestionarios.length} cuestionario(s) creado(s)`}
          </p>
        </div>
        <Link href="/admin/cuestionarios/nuevo" className={buttonVariants({ variant: "default" }) + " gap-2"}>
          <Plus className="h-4 w-4" />
          Nuevo cuestionario
        </Link>
      </div>

      {/* Tabla o estado vacío */}
      {cuestionarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Sin cuestionarios</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primer cuestionario para que los demás puedan responderlo.
            </p>
          </div>
          <Link href="/admin/cuestionarios/nuevo" className={buttonVariants({ variant: "default" })}>
            <Plus className="h-4 w-4 mr-2" />
            Crear cuestionario
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Título</TableHead>
                <TableHead className="font-semibold">Descripción</TableHead>
                <TableHead className="font-semibold text-center">Preguntas</TableHead>
                <TableHead className="font-semibold text-center">Intentos</TableHead>
                <TableHead className="font-semibold">Creado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuestionarios.map((c: CuestionarioListItem) => (
                <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-foreground">{c.titulo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {c.descripcion ?? <span className="italic">Sin descripción</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{c._count.preguntas}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/admin/cuestionarios/${c.id}/intentos`}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Badge
                        variant={c._count.intentos > 0 ? "default" : "outline"}
                        className="gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {c._count.intentos}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.creadoEn).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <AccionesRow id={c.id} titulo={c.titulo} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
