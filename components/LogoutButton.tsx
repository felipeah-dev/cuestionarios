"use client";

import React, { useState, startTransition } from "react";
import { createPortal } from "react-dom";
import { logoutAction } from "@/app/login/_actions";
import { Button } from "@/components/ui/button";
import { LogOut, AlertTriangle } from "lucide-react";

interface Props {
  className?: string;
}

export default function LogoutButton({ className }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative max-w-sm w-full bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Confirmar salida</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          ¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a ingresar
          tus credenciales para acceder de nuevo.
        </p>

        <div className="flex justify-end gap-2.5 pt-1">
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
            type="button"
            className="cursor-pointer active:scale-[0.98] transition-all"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleLogout}
            variant="destructive"
            type="button"
            className="cursor-pointer active:scale-[0.98] transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        type="button"
        className={
          className ||
          "h-8 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all cursor-pointer"
        }
      >
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        <span className="hidden sm:inline text-xs font-medium">Salir</span>
      </Button>

      {isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
