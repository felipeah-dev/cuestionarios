import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldAlert, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CuestionarioForm } from "../../_components/CuestionarioForm";
import { getCuestionario, editarCuestionario } from "../../_actions";
import { prisma } from "@/lib/prisma";
import type { CuestionarioFormValues } from "@/lib/schemas/cuestionario";
import type { CuestionarioConPreguntas } from "../../_actions";

type Pregunta = CuestionarioConPreguntas["preguntas"][number];
type Opcion = Pregunta["opciones"][number];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCuestionarioPage({ params }: Props) {
  const { id } = await params;

  const [cuestionario, intentoCount] = await Promise.all([
    getCuestionario(id),
    prisma.intento.count({ where: { cuestionarioId: id } }),
  ]);

  if (!cuestionario) notFound();

  const header = (
    <div className="flex items-center gap-3">
      <Link
        href="/admin/cuestionarios"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Editar cuestionario
        </h1>
        <p className="text-sm text-muted-foreground">{cuestionario.titulo}</p>
      </div>
    </div>
  );

  if (intentoCount > 0) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto w-full">
        {header}

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Este cuestionario no se puede modificar
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ya tiene{" "}
                <span className="font-semibold text-foreground">
                  {intentoCount} intento{intentoCount !== 1 ? "s" : ""}
                </span>{" "}
                registrado{intentoCount !== 1 ? "s" : ""} de alumnos. Editar las preguntas u
                opciones invalidaría respuestas existentes. Si necesitas hacer
                cambios, crea un nuevo cuestionario.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/admin/cuestionarios/${id}/intentos`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Ver intentos ({intentoCount})
            </Link>
            <Link
              href="/admin/cuestionarios/nuevo"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Crear nuevo cuestionario
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const defaultValues: CuestionarioFormValues = {
    titulo: cuestionario.titulo,
    descripcion: cuestionario.descripcion ?? "",
    preguntas: cuestionario.preguntas.map((p: Pregunta) => ({
      texto: p.texto,
      tipo: p.tipo,
      puntos: p.puntos,
      orden: p.orden,
      opciones: p.opciones.map((o: Opcion) => ({
        texto: o.texto,
        esCorrecta: o.esCorrecta,
      })),
    })),
  };

  async function handleEdit(data: CuestionarioFormValues) {
    "use server";
    return editarCuestionario(id, data);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      {header}
      <CuestionarioForm
        defaultValues={defaultValues}
        onSubmit={handleEdit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
