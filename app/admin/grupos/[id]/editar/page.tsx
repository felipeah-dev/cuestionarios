import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import type { GrupoFormValues } from "@/lib/schemas/grupo";
import { editarGrupoAction, obtenerGrupoDelAdmin } from "../../_actions";
import { GrupoForm } from "../../_components/GrupoForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarGrupoPage({ params }: Props) {
  const { id } = await params;
  const grupo = await obtenerGrupoDelAdmin(id);
  if (!grupo) notFound();

  async function handleEdit(values: GrupoFormValues) {
    "use server";
    return editarGrupoAction(id, values);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/grupos/${id}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver al grupo"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Editar grupo</h1>
          <p className="text-sm text-muted-foreground">
            Actualiza el nombre y la descripcion de la materia.
          </p>
        </div>
      </div>

      <GrupoForm
        defaultValues={{
          nombre: grupo.nombre,
          descripcion: grupo.descripcion ?? "",
        }}
        onSubmit={handleEdit}
        submitLabel="Guardar cambios"
        redirectTo={`/admin/grupos/${id}`}
        showCodeNotice={false}
      />
    </div>
  );
}
