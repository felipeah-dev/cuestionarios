import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CuestionarioForm } from "../../_components/CuestionarioForm";
import { getCuestionario, editarCuestionario } from "../../_actions";
import type { CuestionarioFormValues, CuestionarioConPreguntas } from "../../_actions";

type Pregunta = CuestionarioConPreguntas["preguntas"][number];
type Opcion = Pregunta["opciones"][number];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCuestionarioPage({ params }: Props) {
  const { id } = await params;
  const cuestionario = await getCuestionario(id);

  if (!cuestionario) notFound();

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

      <CuestionarioForm
        defaultValues={defaultValues}
        onSubmit={handleEdit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
