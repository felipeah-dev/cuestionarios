import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";
import { BookOpen } from "lucide-react";

export default async function UsuarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) redirect("/login");
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
