"use client";

import React, { useState, useTransition, useRef } from "react";
import { isRedirectError } from "next/dist/client/components/redirect";
import { saveAnswerAction, submitQuizAction } from "../../_actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface QuizFormProps {
  cuestionario: {
    id: string;
    titulo: string;
    descripcion: string | null;
    preguntas: Array<{
      id: string;
      texto: string;
      tipo: "OPCION_MULTIPLE" | "ABIERTA";
      puntos: number;
      orden: number;
      opciones: Array<{
        id: string;
        texto: string;
      }>;
    }>;
  };
  intento: {
    id: string;
    cuestionarioId: string;
    respuestas: Array<{
      id: string;
      preguntaId: string;
      opcionId: string | null;
      respuestaAbierta: string | null;
    }>;
  };
}

export default function QuizForm({ cuestionario, intento }: QuizFormProps) {
  // Load answers from the database to pre-populate local state
  const [respuestas, setRespuestas] = useState<
    Record<string, { opcionId?: string; respuestaAbierta?: string }>
  >(() => {
    const mapa: Record<string, { opcionId?: string; respuestaAbierta?: string }> = {};
    intento.respuestas.forEach((r) => {
      mapa[r.preguntaId] = {
        opcionId: r.opcionId || undefined,
        respuestaAbierta: r.respuestaAbierta || undefined,
      };
    });
    return mapa;
  });

  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Tracks the last successfully saved text per question to avoid redundant saves on blur
  const lastSavedRef = useRef<Record<string, string>>(
    Object.fromEntries(
      intento.respuestas
        .filter((r) => r.respuestaAbierta !== null)
        .map((r) => [r.preguntaId, r.respuestaAbierta!])
    )
  );

  const preguntas = cuestionario.preguntas;
  const preguntaActual = preguntas[currentQuestionIndex];

  // Number of completed answers
  const totalRespondidas = preguntas.filter((p) => {
    const res = respuestas[p.id];
    if (!res) return false;
    if (p.tipo === "OPCION_MULTIPLE") return !!res.opcionId;
    if (p.tipo === "ABIERTA") return !!res.respuestaAbierta && res.respuestaAbierta.trim() !== "";
    return false;
  }).length;

  const porcentajeProgreso = preguntas.length > 0 ? (totalRespondidas / preguntas.length) * 100 : 0;

  // Background auto-saving of answer selection/input
  const handleSaveAnswer = async (
    preguntaId: string,
    data: { opcionId?: string | null; respuestaAbierta?: string | null }
  ) => {
    // Optimistic local state update
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: {
        opcionId: data.opcionId !== undefined ? (data.opcionId || undefined) : prev[preguntaId]?.opcionId,
        respuestaAbierta:
          data.respuestaAbierta !== undefined
            ? (data.respuestaAbierta || undefined)
            : prev[preguntaId]?.respuestaAbierta,
      },
    }));

    // Show saving status for this specific question
    setSavingMap((prev) => ({ ...prev, [preguntaId]: true }));

    try {
      await saveAnswerAction(intento.id, preguntaId, {
        opcionId: data.opcionId,
        respuestaAbierta: data.respuestaAbierta,
      });
      // Update ref so the next blur comparison uses the freshly saved value
      if (data.respuestaAbierta !== undefined) {
        lastSavedRef.current[preguntaId] = data.respuestaAbierta ?? "";
      }
    } catch (error) {
      console.error("Error al autoguardar respuesta:", error);
    } finally {
      setSavingMap((prev) => ({ ...prev, [preguntaId]: false }));
    }
  };

  const handleTextareaBlur = (preguntaId: string, textValue: string) => {
    if (textValue !== (lastSavedRef.current[preguntaId] ?? "")) {
      handleSaveAnswer(preguntaId, { respuestaAbierta: textValue });
    }
  };

  const handleFinalSubmit = () => {
    startSubmitTransition(async () => {
      try {
        await submitQuizAction(intento.id);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        console.error("Error al enviar el cuestionario:", e);
      }
    });
  };

  const isSavingAny = Object.values(savingMap).some(Boolean);

  if (preguntas.length === 0) {
    return (
      <Card className="border border-border/60 p-8 text-center bg-card/60 backdrop-blur-md">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 stroke-1.5" />
        <h3 className="text-lg font-bold">Este cuestionario no tiene preguntas</h3>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          Por favor, ponte en contacto con tu administrador para que agregue preguntas.
        </p>
        <Link href="/usuario/cuestionarios">
          <Button variant="outline" className="rounded-xl">
            Volver a Cuestionarios
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Top Header showing progress & autoguardado */}
      <header className="sticky top-[55px] z-40 bg-card/85 backdrop-blur-xl border border-border/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/usuario/cuestionarios">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base md:text-lg line-clamp-1 text-foreground">
              {cuestionario.titulo}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-foreground/80 shrink-0">
                {totalRespondidas} de {preguntas.length} respondidas
              </span>
              <span className="shrink-0">•</span>
              <span className="flex items-center gap-1.5 font-medium shrink-0">
                {isSavingAny ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                    <span className="text-amber-500 font-bold">Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Progreso guardado</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full sm:w-48 flex flex-col gap-1.5 shrink-0">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>
          <span className="text-[10px] text-right font-bold text-muted-foreground uppercase tracking-wider">
            {porcentajeProgreso.toFixed(0)}% completado
          </span>
        </div>
      </header>

      {/* Grid: Navigation on Left/Top, Question Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 order-last lg:order-first">
          <div className="p-4 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center lg:text-left">
              Navegación
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-3 gap-2">
              {preguntas.map((p, idx) => {
                const res = respuestas[p.id];
                const estaRespondida =
                  p.tipo === "OPCION_MULTIPLE"
                    ? !!res?.opcionId
                    : !!res?.respuestaAbierta && res.respuestaAbierta.trim() !== "";
                const esActual = idx === currentQuestionIndex;

                let btnVariant: "outline" | "default" | "secondary" = "outline";
                if (esActual) btnVariant = "default";
                else if (estaRespondida) btnVariant = "secondary";

                return (
                  <Button
                    key={p.id}
                    variant={btnVariant}
                    className={`h-10 w-full rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                      estaRespondida && !esActual
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        : ""
                    }`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                  >
                    {idx + 1}
                    {estaRespondida && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Question Panel */}
        <main className="lg:col-span-9 space-y-6">
          <Card className="border border-border/60 shadow-md bg-card/60 backdrop-blur-xl overflow-hidden transition-all duration-300">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-primary tracking-widest uppercase">
                  Pregunta {currentQuestionIndex + 1} de {preguntas.length}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-muted-foreground border-border/80"
                >
                  Valor: {preguntaActual.puntos} pts
                </Badge>
              </div>
              <CardTitle className="text-lg md:text-xl font-bold mt-2 text-foreground leading-snug">
                {preguntaActual.texto}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {preguntaActual.tipo === "OPCION_MULTIPLE" ? (
                <div className="grid grid-cols-1 gap-3.5">
                  {preguntaActual.opciones.map((opcion, oIdx) => {
                    const letra = String.fromCharCode(65 + oIdx); // A, B, C, D...
                    const estaSeleccionada = respuestas[preguntaActual.id]?.opcionId === opcion.id;

                    return (
                      <div
                        key={opcion.id}
                        onClick={() =>
                          handleSaveAnswer(preguntaActual.id, { opcionId: opcion.id })
                        }
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                          estaSeleccionada
                            ? "border-primary bg-primary/10 text-primary-foreground font-semibold shadow-sm"
                            : "border-border/60 hover:border-primary/30 hover:bg-secondary/20 bg-secondary/10"
                        }`}
                      >
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${
                            estaSeleccionada
                              ? "bg-primary border-primary text-white"
                              : "border-border/80 text-muted-foreground"
                          }`}
                        >
                          {letra}
                        </div>
                        <span
                          className={`text-sm text-foreground/90 leading-snug ${
                            estaSeleccionada ? "text-foreground font-medium" : ""
                          }`}
                        >
                          {opcion.texto}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    placeholder="Escribe tu respuesta aquí de forma detallada. Tu progreso se guardará automáticamente al salir de este campo..."
                    className="w-full min-h-[140px] p-4 rounded-xl border border-border/60 bg-secondary/10 focus:bg-background/80 focus:ring-1 focus:ring-primary focus:border-primary text-sm leading-relaxed transition-all resize-y outline-none text-foreground"
                    value={respuestas[preguntaActual.id]?.respuestaAbierta || ""}
                    onChange={(e) => {
                      setRespuestas((prev) => ({
                        ...prev,
                        [preguntaActual.id]: {
                          ...prev[preguntaActual.id],
                          respuestaAbierta: e.target.value,
                        },
                      }));
                    }}
                    onBlur={(e) => handleTextareaBlur(preguntaActual.id, e.target.value)}
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-semibold tracking-wider px-1">
                    <span>Guardado automático al perder foco o navegar</span>
                    <span>Caracteres: {(respuestas[preguntaActual.id]?.respuestaAbierta || "").length}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              className="rounded-xl font-bold border-border/60 hover:bg-secondary/50 cursor-pointer text-xs h-10 px-4"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5 shrink-0" />
              Anterior
            </Button>

            {currentQuestionIndex < preguntas.length - 1 ? (
              <Button
                variant="outline"
                className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 cursor-pointer text-xs h-10 px-4"
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-1.5 shrink-0" />
              </Button>
            ) : (
              <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogTrigger
                  render={
                    <Button variant="default" className="rounded-xl font-bold px-6 shadow-md shadow-primary/20 cursor-pointer text-xs h-10">
                      Enviar Cuestionario
                      <CheckCircle2 className="h-4 w-4 ml-1.5 shrink-0" />
                    </Button>
                  }
                />
                <DialogContent className="rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl max-w-md w-[95%]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      ¿Confirmas el envío?
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground pt-2 leading-relaxed">
                      Has respondido <strong>{totalRespondidas} de {preguntas.length}</strong> preguntas. Una vez enviado, tu intento se registrará y no podrás modificar tus respuestas.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      className="rounded-xl font-bold text-xs"
                      onClick={() => setShowConfirmDialog(false)}
                      disabled={isSubmitting}
                    >
                      Seguir Revisando
                    </Button>
                    <Button
                      variant="default"
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10 font-bold text-xs"
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Calificando...
                        </>
                      ) : (
                        "Sí, Enviar Examen"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
