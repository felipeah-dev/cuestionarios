import Link from "next/link";
import { BookOpen, ChevronLeft, FileText, Pencil, Users } from "lucide-react";
import { notFound } from "next/navigation";
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
import { obtenerGrupoDelAdmin } from "../_actions";
import { CodigoGrupo } from "../_components/CodigoGrupo";
import { QuitarAlumnoButton } from "../_components/QuitarAlumnoButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DetalleGrupoPage({ params }: Props) {
  const { id } = await params;
  const grupo = await obtenerGrupoDelAdmin(id);
  if (!grupo) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/grupos"
            className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Volver a grupos"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">{grupo.nombre}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {grupo.descripcion || "Sin descripcion proporcionada."}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <Link
            href={`/admin/grupos/${grupo.id}/editar`}
            className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar grupo
          </Link>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">
              Codigo para alumnos
            </p>
            <CodigoGrupo codigo={grupo.codigo} />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Alumnos inscritos</h2>
          <Badge variant="outline">{grupo.miembros.length}</Badge>
        </div>

        {grupo.miembros.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Comparte el codigo del grupo. Los alumnos apareceran aqui al inscribirse.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Fecha de ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupo.miembros.map((membresia) => (
                  <TableRow key={membresia.id}>
                    <TableCell className="font-medium text-foreground">
                      {membresia.usuario.nombre}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {membresia.usuario.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(membresia.unidoEn)}
                    </TableCell>
                    <TableCell className="text-right">
                      <QuitarAlumnoButton
                        grupoId={grupo.id}
                        usuarioId={membresia.usuario.id}
                        alumnoNombre={membresia.usuario.nombre}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Cuestionarios asignados</h2>
            <Badge variant="outline">{grupo.cuestionarios.length}</Badge>
          </div>
          <Link
            href="/admin/cuestionarios/nuevo"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Nuevo cuestionario
          </Link>
        </div>

        {grupo.cuestionarios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Todavia no hay cuestionarios asignados a esta materia.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {grupo.cuestionarios.map((cuestionario) => (
              <Link
                key={cuestionario.id}
                href={`/admin/cuestionarios/${cuestionario.id}/intentos`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{cuestionario.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {cuestionario._count.preguntas} preguntas · {cuestionario._count.intentos} intentos
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
