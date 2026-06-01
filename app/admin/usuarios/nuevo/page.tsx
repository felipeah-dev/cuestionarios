import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UsuarioForm } from "../_components/UsuarioForm";

export default function NuevoUsuarioPage() {
  return (
    <div className="space-y-6 max-w-2xl w-full mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/usuarios"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Nuevo alumno
          </h1>
          <p className="text-sm text-muted-foreground">
            El alumno podrá iniciar sesión con el correo y contraseña que asignes.
          </p>
        </div>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-6">
          <UsuarioForm />
        </CardContent>
      </Card>
    </div>
  );
}
