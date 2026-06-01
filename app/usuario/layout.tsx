import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";
import { BookOpen, AlertTriangle, LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function UsuarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) redirect("/login");

  // Verify the user exists in the database (safeguard against stale cookies post-reseeding)
  const dbUser = await prisma.usuario.findUnique({
    where: { id: session.user.id },
  });
  
  if (!dbUser) {
    // Render a premium recovery screen. The form action uses a Server Action,
    // which is fully allowed by Next.js to modify cookies and log the user out cleanly.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground font-sans">
        <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto h-12 w-12 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-center text-destructive">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">Sesión Invalida o Caducada</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La base de datos fue restablecida recientemente y tu sesión actual ya no es válida en el servidor.
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              type="submit"
              variant="destructive"
              className="w-full rounded-xl cursor-pointer h-10 font-bold shadow-md shadow-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión e Ingresar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (session.user.rol !== "USUARIO") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-5">
          <Link
            href="/usuario/dashboard"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              <BookOpen className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-foreground tracking-tight hidden md:block">
              Portal Cuestionarios
            </span>
          </Link>

          <div className="w-px h-5 bg-border shrink-0 hidden md:block" />

          <div className="flex-1">
            <NavLinks role="usuario" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">
                {session.user.name}
              </p>
              <p className="text-[10px] text-primary font-bold tracking-widest uppercase mt-0.5">
                ALUMNO
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
