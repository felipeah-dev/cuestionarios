import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CuestionarioForm } from "../_components/CuestionarioForm";
import { crearCuestionario } from "../_actions";

export default function NuevoCuestionarioPage() {
  return (
    <div className="space-y-6 max-w-3xl">
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

      <CuestionarioForm onSubmit={crearCuestionario} submitLabel="Crear cuestionario" />
    </div>
  );
}
