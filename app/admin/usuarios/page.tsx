import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, BookOpen, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { listarUsuarios } from "./_actions";
import type { UsuarioListItem } from "./_actions";

export default async function AdminUsuariosPage() {
  const usuarios = await listarUsuarios();

  const fechaFmt = (d: Date) =>
    new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {usuarios.length} alumno{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className={cn(buttonVariants({ variant: "default" }), "gap-2 self-start sm:self-auto")}
        >
          <Plus className="h-4 w-4" />
          Nuevo alumno
        </Link>
      </div>

      {/* Estado vacío */}
      {usuarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Sin alumnos registrados</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea el primer alumno para que pueda acceder a la plataforma.
            </p>
          </div>
          <Link href="/admin/usuarios/nuevo" className={buttonVariants({ variant: "default" })}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primer alumno
          </Link>
        </div>
      ) : (
        <>
          {/* Tabla — visible en md+ */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Correo</TableHead>
                  <TableHead className="font-semibold text-center">Intentos</TableHead>
                  <TableHead className="font-semibold">Registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u: UsuarioListItem) => (
                  <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-foreground">{u.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{u._count.intentos}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fechaFmt(u.creadoEn)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — visible en mobile */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {usuarios.map((u: UsuarioListItem) => (
              <Card key={u.id} className="border border-border/60 bg-card shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{u.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      {u._count.intentos} intento{u._count.intentos !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {fechaFmt(u.creadoEn)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
