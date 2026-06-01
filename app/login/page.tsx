"use client";

import React, { useActionState } from "react";
import { loginAction } from "./_actions";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Evaluaciones seguras",
    desc: "Cada intento queda registrado con tu identidad verificada.",
  },
  {
    icon: Zap,
    title: "Resultados al instante",
    desc: "Calificación automática con retroalimentación inmediata.",
  },
  {
    icon: Users,
    title: "Gestión completa",
    desc: "Administradores con control total sobre cuestionarios.",
  },
];

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Panel izquierdo: branding ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-2/5 flex-col justify-between p-12 bg-primary/5 border-r border-border relative overflow-hidden">
        {/* Grid sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "3.5rem 3.5rem",
          }}
        />
        {/* Glow de marca */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-12 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo top */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <BookOpen className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-base text-foreground tracking-tight">
              Portal Académico
            </span>
          </div>
        </div>

        {/* Copy central */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Evaluaciones académicas,{" "}
              <span className="text-primary">sin complicaciones.</span>
            </h1>
            <p className="text-muted-foreground text-[0.9rem] leading-relaxed max-w-[22rem]">
              Plataforma de cuestionarios diseñada para alumnos y administradores.
              Accede, responde y revisa tus resultados en un solo lugar.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          Universidad · Ingeniería en Desarrollo de Software
        </p>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <BookOpen className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-foreground">Portal Académico</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {state?.error && (
            <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/25 p-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="pl-9 h-11"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Contraseña
              </label>
              <PasswordInput
                id="password"
                name="password"
                leftIcon={<Lock className="h-4 w-4" />}
                autoComplete="current-password"
                required
                disabled={isPending}
                className="h-11"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 font-semibold shadow-md shadow-primary/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Ingresar al Portal"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
