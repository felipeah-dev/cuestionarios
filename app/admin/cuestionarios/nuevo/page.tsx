import Link from "next/link";
import { ChevronLeft, GraduationCap, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CuestionarioForm } from "../_components/CuestionarioForm";
import { crearCuestionario } from "../_actions";
import { listarGruposDelAdmin } from "../../grupos/_actions";

export default async function NuevoCuestionarioPage() {
  const grupos = await listarGruposDelAdmin();

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
            Nuevo cuestionario
          </h1>
          <p className="text-sm text-muted-foreground">
            Completa los datos y agrega las preguntas.
          </p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="space-y-4 rounded-lg border border-warning/40 bg-warning/10 p-6">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-foreground">Primero crea una materia o grupo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada cuestionario nuevo debe pertenecer a un grupo para que solamente sus
                alumnos inscritos puedan verlo.
              </p>
            </div>
          </div>
          <Link
            href="/admin/grupos/nuevo"
            className={`${buttonVariants({ variant: "default" })} gap-2`}
          >
            <Plus className="h-4 w-4" />
            Crear grupo
          </Link>
        </div>
      ) : (
        <CuestionarioForm
          grupos={grupos.map(({ id, nombre, codigo }) => ({ id, nombre, codigo }))}
          onSubmit={crearCuestionario}
          submitLabel="Crear cuestionario"
        />
      )}
    </div>
  );
}
