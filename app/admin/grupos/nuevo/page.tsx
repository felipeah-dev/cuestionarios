import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GrupoForm } from "../_components/GrupoForm";

export default function NuevoGrupoPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/grupos"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver a grupos"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Nueva materia o grupo</h1>
          <p className="text-sm text-muted-foreground">
            Organiza alumnos y asigna cuestionarios desde un solo espacio.
          </p>
        </div>
      </div>

      <GrupoForm />
    </div>
  );
}
