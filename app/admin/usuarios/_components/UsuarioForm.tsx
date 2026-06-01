"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { crearUsuario } from "../_actions";

// ─── Reglas de validación ─────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { label: "Mínimo 8 caracteres",          test: (p: string) => p.length >= 8 },
  { label: "Al menos una mayúscula (A-Z)",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "Al menos una minúscula (a-z)",  test: (p: string) => /[a-z]/.test(p) },
  { label: "Al menos un número (0-9)",      test: (p: string) => /[0-9]/.test(p) },
  { label: "Al menos un símbolo (!@#$...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const passwordValida = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

// ─── Componente ───────────────────────────────────────────────────────────────

export function UsuarioForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirm: false,
  });

  const emailError =
    touched.email && !EMAIL_REGEX.test(email) ? "Correo inválido" : null;
  const confirmError =
    touched.confirm && confirm !== password ? "Las contraseñas no coinciden" : null;
  const pwOk = passwordValida(password);
  const formValido =
    EMAIL_REGEX.test(email) && pwOk && password === confirm;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    if (!formValido) return;

    const nombre = (e.currentTarget.elements.namedItem("nombre") as HTMLInputElement).value;

    startTransition(async () => {
      const result = await crearUsuario({ nombre, email, password });

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      router.push("/admin/usuarios");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre + Correo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label htmlFor="nombre" className="text-sm font-medium text-foreground">
            Nombre completo <span className="text-destructive">*</span>
          </label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. María García"
            required
            disabled={isPending}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo electrónico <span className="text-destructive">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            disabled={isPending}
            autoComplete="off"
            className={emailError ? "border-destructive" : ""}
          />
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>
      </div>

      {/* Contraseña + Confirmación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña <span className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Crea una contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            disabled={isPending}
            autoComplete="new-password"
            className={touched.password && !pwOk ? "border-destructive" : ""}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-foreground">
            Confirmar contraseña <span className="text-destructive">*</span>
          </label>
          <PasswordInput
            id="confirm"
            placeholder="Repite la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            disabled={isPending}
            autoComplete="new-password"
            className={confirmError ? "border-destructive" : ""}
          />
          {confirmError && (
            <p className="text-xs text-destructive">{confirmError}</p>
          )}
        </div>
      </div>

      {/* Checklist de requisitos — visible cuando el campo tiene texto */}
      {password.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Requisitos de contraseña
          </p>
          {PASSWORD_RULES.map((rule) => {
            const cumple = rule.test(password);
            return (
              <div key={rule.label} className="flex items-center gap-2 text-xs">
                {cumple ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={cumple ? "text-foreground" : "text-muted-foreground"}>
                  {rule.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error del servidor */}
      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {serverError}
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || !formValido}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Crear alumno
        </Button>
      </div>
    </form>
  );
}
