"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CodigoGrupo({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(codigo);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <code className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold tracking-[0.18em] text-primary">
        {codigo}
      </code>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={copyCode}
        title={copied ? "Codigo copiado" : "Copiar codigo"}
        aria-label={copied ? "Codigo copiado" : "Copiar codigo"}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
