import Link from "next/link";
import { BookOpen, GraduationCap, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UnirseGrupoForm } from "./_components/UnirseGrupoForm";

export default async function UsuarioGruposPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membresias = await prisma.grupoMiembro.findMany({
    where: { usuarioId: user.id },
    orderBy: { unidoEn: "desc" },
    include: {
      grupo: {
        include: {
          admin: { select: { nombre: true } },
          _count: { select: { cuestionarios: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground">Mis materias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unete con un codigo y consulta las materias en las que estas inscrito.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <UnirseGrupoForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Grupos inscritos</h2>
            <p className="text-xs text-muted-foreground">
              {membresias.length} materia(s)
            </p>
          </div>
        </div>

        {membresias.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
            <GraduationCap className="mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-semibold text-foreground">Todavia no perteneces a un grupo</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Pidele el codigo a tu profesor y escribelo en el formulario de arriba.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {membresias.map(({ grupo }) => (
              <Card key={grupo.id} className="border-border/70 bg-card">
                <CardHeader className="pb-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-mono tracking-[0.12em]">
                      {grupo.codigo}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{grupo.nombre}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="min-h-10 text-sm leading-relaxed text-muted-foreground">
                    {grupo.descripcion || "Sin descripcion proporcionada."}
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5" />
                      {grupo.admin.nombre}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {grupo._count.cuestionarios}
                    </span>
                  </div>
                  <Button
                    render={<Link href={`/usuario/cuestionarios?grupo=${grupo.id}`} />}
                    nativeButton={false}
                    variant="outline"
                    className="w-full"
                  >
                    Ver cuestionarios
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
