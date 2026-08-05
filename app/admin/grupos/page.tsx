import Link from "next/link";
import { BookOpen, Eye, Plus, Users } from "lucide-react";
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
import { listarGruposDelAdmin } from "./_actions";
import { CodigoGrupo } from "./_components/CodigoGrupo";

export default async function AdminGruposPage() {
  const grupos = await listarGruposDelAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Materias y grupos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea un grupo y comparte su codigo con tus alumnos.
          </p>
        </div>
        <Link
          href="/admin/grupos/nuevo"
          className={`${buttonVariants({ variant: "default" })} gap-2`}
        >
          <Plus className="h-4 w-4" />
          Nuevo grupo
        </Link>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed border-border py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Aun no tienes grupos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea tu primera materia para poder asignarle cuestionarios.
            </p>
          </div>
          <Link href="/admin/grupos/nuevo" className={buttonVariants({ variant: "default" })}>
            Crear primer grupo
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Materia o grupo</TableHead>
                <TableHead className="font-semibold">Codigo de acceso</TableHead>
                <TableHead className="text-center font-semibold">Alumnos</TableHead>
                <TableHead className="text-center font-semibold">Cuestionarios</TableHead>
                <TableHead className="font-semibold">Creado</TableHead>
                <TableHead className="text-right font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map((grupo) => (
                <TableRow key={grupo.id}>
                  <TableCell>
                    <Link
                      href={`/admin/grupos/${grupo.id}`}
                      className="font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {grupo.nombre}
                    </Link>
                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                      {grupo.descripcion || "Sin descripcion"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <CodigoGrupo codigo={grupo.codigo} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {grupo._count.miembros}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {grupo._count.cuestionarios}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(grupo.creadoEn)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/grupos/${grupo.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      title={`Ver detalles de ${grupo.nombre}`}
                      aria-label={`Ver detalles de ${grupo.nombre}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
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
