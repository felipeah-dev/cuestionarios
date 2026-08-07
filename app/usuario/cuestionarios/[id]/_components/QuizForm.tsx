"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  finishQuizAttemptAction,
  saveAnswerAction,
  startQuizAttemptAction,
  submitQuizAction,
} from "../../_actions";
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
  Bot,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Camera,
  Clock3,
  Loader2,
  FileText,
  Mic,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import {
  formatCountdown,
  formatDuration,
  getActiveAttemptRemainingSeconds,
  getQuizEstimatedMinutes,
} from "@/lib/quiz-rules";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type QuizAttempt = {
  id: string;
  cuestionarioId: string;
  creadoEn: Date | string;
  estado: string;
  reactivadoEn: Date | string | null;
  tiempoRestanteSegundos: number | null;
  respuestas: Array<{
    id: string;
    preguntaId: string;
    opcionId: string | null;
    respuestaAbierta: string | null;
  }>;
};

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
  intento: QuizAttempt | null;
  proctoringConfig: {
    captureMinSeconds: number;
    captureMaxSeconds: number;
  };
}

type FaultWarning = {
  isBlocking: boolean;
  tipo: "camara" | "ruido";
  faultCount: number;
  descripcion: string;
};

type MediaStatus =
  | "idle"
  | "checking"
  | "calibrating"
  | "granted"
  | "denied"
  | "unsupported";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Factor multiplicador para el umbral de ruido: +15 dB sobre el baseline (10^(15/20) ≈ 5.62) */
const NOISE_RMS_MULTIPLIER = 5.62;
/** Milisegundos sostenidos de ruido para disparar una falta */
const NOISE_SUSTAINED_MS = 3000;
/** Milisegundos de audio a grabar como evidencia */
const NOISE_RECORDING_MS = 5000;
/** Cooldown entre alertas de ruido */
const NOISE_COOLDOWN_MS = 30000;
/** Duración de la calibración inicial */
const NOISE_CALIBRATION_MS = 5000;
/** Tamaño del buffer del analizador FFT */
const ANALYSER_FFT_SIZE = 2048;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function QuizForm({
  cuestionario,
  intento,
  proctoringConfig,
}: QuizFormProps) {
  const router = useRouter();
  const preguntas = cuestionario.preguntas;
  const duracionEstimada = getQuizEstimatedMinutes(preguntas);
  const totalDurationSeconds = duracionEstimada * 60;

  // ── Refs de media ──
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // ── Refs de proctoring / seguridad ──
  const finalizingRef = useRef(false);
  const historyGuardPushedRef = useRef(false);
  const proctoringUploadRef = useRef(false);

  // ── Refs de detección de ruido ──
  const noiseBaselineRef = useRef<number>(0);
  const noiseAboveStartRef = useRef<number | null>(null);
  const lastNoiseTimeRef = useRef<number | null>(null);
  const noiseBurstTimesRef = useRef<number[]>([]);
  const noiseCooldownRef = useRef(false);
  const noiseRecorderRef = useRef<MediaRecorder | null>(null);
  const noiseChunksRef = useRef<Blob[]>([]);

  // ── Estado de UI ──
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>("idle");
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [violationMessage, setViolationMessage] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(intento);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    intento
      ? getActiveAttemptRemainingSeconds(intento, duracionEstimada)
      : totalDurationSeconds
  );

  // ── Estado de faltas ──
  const [activeFaultWarning, setActiveFaultWarning] = useState<FaultWarning | null>(null);

  // ── Estado de ruido ──
  const [noiseLevelRms, setNoiseLevelRms] = useState(0);
  const [noiseIsAboveThreshold, setNoiseIsAboveThreshold] = useState(false);
  const [noiseIsRecording, setNoiseIsRecording] = useState(false);

  // ── Estado de respuestas ──
  const [respuestas, setRespuestas] = useState<
    Record<string, { opcionId?: string; respuestaAbierta?: string }>
  >(() => {
    const mapa: Record<string, { opcionId?: string; respuestaAbierta?: string }> = {};
    intento?.respuestas.forEach((r) => {
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

  const lastSavedRef = useRef<Record<string, string>>(
    Object.fromEntries(
      (intento?.respuestas ?? [])
        .filter((r) => r.respuestaAbierta !== null)
        .map((r) => [r.preguntaId, r.respuestaAbierta!])
    )
  );

  const preguntaActual = preguntas[currentQuestionIndex];

  // ─── Manejadores de seguridad ──────────────────────────────────────────────

  const finishAttemptForSecurity = useCallback(
    (message: string, options?: { beacon?: boolean }) => {
      if (!activeAttempt) return;
      if (finalizingRef.current) return;
      finalizingRef.current = true;
      setViolationMessage(message);

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      cancelAnimationFrame(animationFrameRef.current ?? 0);
      audioContextRef.current?.close().catch(() => null);

      if (options?.beacon && navigator.sendBeacon) {
        const body = new Blob(["{}"], { type: "application/json" });
        navigator.sendBeacon(`/api/intentos/${activeAttempt.id}/finalizar`, body);
        window.setTimeout(() => {
          router.replace(`/usuario/cuestionarios/${cuestionario.id}/resultado`);
          router.refresh();
        }, 800);
        return;
      }

      startSubmitTransition(async () => {
        try {
          const result = await finishQuizAttemptAction(activeAttempt.id);
          router.replace(result.redirectTo);
          router.refresh();
        } catch (error) {
          console.error("Error al finalizar intento por seguridad:", error);
        }
      });
    },
    [activeAttempt, cuestionario.id, router]
  );

  const handleProctoringFault = useCallback(
    (data: {
      warned: boolean;
      blocked: boolean;
      faultCount: number;
      tipo: "camara" | "ruido";
      descripcion?: string;
    }) => {
      const defaultDesc =
        data.tipo === "ruido"
          ? "Se detectó ruido excesivo sostenido por 3 segundos continuos (+15 dB sobre el nivel base)."
          : "Se detectó una irregularidad visual en tu sesión.";

      if (data.blocked) {
        setActiveFaultWarning({
          isBlocking: true,
          tipo: data.tipo,
          faultCount: data.faultCount,
          descripcion: data.descripcion || defaultDesc,
        });
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animationFrameRef.current ?? 0);
        audioContextRef.current?.close().catch(() => null);
      } else if (data.warned) {
        setActiveFaultWarning({
          isBlocking: false,
          tipo: data.tipo,
          faultCount: data.faultCount,
          descripcion: data.descripcion || defaultDesc,
        });
      }
    },
    []
  );

  // ─── Captura de cámara ────────────────────────────────────────────────────

  const captureProctoringSnapshot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 480;
    const targetWidth = Math.min(sourceWidth, 960);
    const targetHeight = Math.round(sourceHeight * (targetWidth / sourceWidth));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.72);
    });
  }, []);

  const uploadProctoringSnapshot = useCallback(async () => {
    if (!activeAttempt || proctoringUploadRef.current) return;

    const snapshot = await captureProctoringSnapshot();
    if (!snapshot) return;

    proctoringUploadRef.current = true;
    try {
      const formData = new FormData();
      formData.append("snapshot", snapshot, "snapshot.jpg");

      const response = await fetch(
        `/api/intentos/${activeAttempt.id}/proctoring/snapshot`,
        { method: "POST", body: formData }
      );

      if (!response.ok) return;

      const data = (await response.json()) as {
        warned?: boolean;
        blocked?: boolean;
        faultCount?: number;
        descripcion?: string;
        estado?: string;
      };

      if (data.warned || data.blocked) {
        handleProctoringFault({
          warned: data.warned ?? false,
          blocked: data.blocked ?? false,
          faultCount: data.faultCount ?? 0,
          tipo: "camara",
          descripcion: data.descripcion,
        });
      }
    } catch (error) {
      console.error("Error al enviar snapshot de proctoring:", error);
    } finally {
      proctoringUploadRef.current = false;
    }
  }, [activeAttempt, captureProctoringSnapshot, handleProctoringFault]);

  // ─── Grabación y envío de audio de ruido ──────────────────────────────────

  const sendNoiseRecording = useCallback(
    async (audioBlob: Blob) => {
      if (!activeAttempt) return;
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "ruido.webm");

        const response = await fetch(
          `/api/intentos/${activeAttempt.id}/proctoring/noise`,
          { method: "POST", body: formData }
        );

        if (!response.ok) return;

        const data = (await response.json()) as {
          warned?: boolean;
          blocked?: boolean;
          faultCount?: number;
          descripcion?: string;
        };

        if (data.warned || data.blocked) {
          handleProctoringFault({
            warned: data.warned ?? false,
            blocked: data.blocked ?? false,
            faultCount: data.faultCount ?? 0,
            tipo: "ruido",
            descripcion: data.descripcion,
          });
        }
      } catch (error) {
        console.error("Error al enviar grabación de ruido:", error);
      }
    },
    [activeAttempt, handleProctoringFault]
  );

  // ─── Acceso a medios ──────────────────────────────────────────────────────

  const requestMediaAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaStatus("unsupported");
      return;
    }

    setMediaStatus("checking");

    try {
      // Desactivar AGC para preservar la señal real — necesario para la calibración
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          autoGainControl: false,
          noiseSuppression: false,
          echoCancellation: false,
        },
      });
      mediaStreamRef.current = stream;

      // Iniciar calibración antes de arrancar el examen
      setMediaStatus("calibrating");
      setCalibrationProgress(0);

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = ANALYSER_FFT_SIZE;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      let sumOfSquares = 0;
      let totalSamples = 0;
      const startTime = Date.now();

      await new Promise<void>((resolve) => {
        const sampleLoop = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / NOISE_CALIBRATION_MS) * 100);
          setCalibrationProgress(Math.floor(progress));

          analyser.getFloatTimeDomainData(buffer);
          for (let i = 0; i < buffer.length; i++) {
            sumOfSquares += buffer[i] * buffer[i];
          }
          totalSamples += buffer.length;

          if (elapsed >= NOISE_CALIBRATION_MS) {
            resolve();
          } else {
            requestAnimationFrame(sampleLoop);
          }
        };
        requestAnimationFrame(sampleLoop);
      });

      // El baseline es el RMS promedio durante los 5s de silencio
      noiseBaselineRef.current = totalSamples > 0
        ? Math.sqrt(sumOfSquares / totalSamples)
        : 0.01;

      const attempt = await startQuizAttemptAction(cuestionario.id);
      const answerMap: Record<string, { opcionId?: string; respuestaAbierta?: string }> = {};
      attempt.respuestas.forEach((respuesta) => {
        answerMap[respuesta.preguntaId] = {
          opcionId: respuesta.opcionId || undefined,
          respuestaAbierta: respuesta.respuestaAbierta || undefined,
        };
      });

      setActiveAttempt(attempt);
      setRemainingSeconds(getActiveAttemptRemainingSeconds(attempt, duracionEstimada));
      setRespuestas(answerMap);
      lastSavedRef.current = Object.fromEntries(
        attempt.respuestas
          .filter((r) => r.respuestaAbierta !== null)
          .map((r) => [r.preguntaId, r.respuestaAbierta!])
      );
      setMediaStatus("granted");
    } catch {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => null);
      setMediaStatus("denied");
    }
  }, [cuestionario.id, duracionEstimada]);

  // ─── useEffect: limpieza al desmontar ────────────────────────────────────

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      cancelAnimationFrame(animationFrameRef.current ?? 0);
      audioContextRef.current?.close().catch(() => null);
    };
  }, []);

  // ─── useEffect: conectar video al stream ──────────────────────────────────

  useEffect(() => {
    if (mediaStatus !== "granted" || !activeAttempt || !videoRef.current) return;

    const video = videoRef.current;
    const stream = mediaStreamRef.current;
    if (!stream) return;

    video.srcObject = stream;
    void video.play().catch((error) => {
      console.error("No se pudo iniciar el video de proctoring:", error);
    });

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [activeAttempt, mediaStatus]);

  // ─── useEffect: guardia de seguridad (foco, historial, multi-ventana) ─────

  useEffect(() => {
    if (mediaStatus !== "granted" || !activeAttempt) return;

    if (!historyGuardPushedRef.current) {
      window.history.pushState(
        { cuestionariosAttemptGuard: activeAttempt.id },
        "",
        window.location.href
      );
      historyGuardPushedRef.current = true;
    }

    let shouldFinalizeOnUnmount = false;
    const armUnmountTimer = window.setTimeout(() => {
      shouldFinalizeOnUnmount = true;
    }, 500);

    const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const lockKey = `cuestionarios-active-attempt-${activeAttempt.id}`;
    const channelName = `cuestionarios-attempt-${activeAttempt.id}`;
    const existingSession = window.localStorage.getItem(lockKey);

    if (existingSession && existingSession !== sessionId) {
      finishAttemptForSecurity(
        "Se detecto otra ventana con este examen. El intento se finalizo automaticamente."
      );
      return;
    }

    window.localStorage.setItem(lockKey, sessionId);

    const channel =
      "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null;

    channel?.postMessage({ type: "active", sessionId });
    channel?.addEventListener("message", (event) => {
      if (
        event.data?.type === "active" &&
        event.data?.sessionId &&
        event.data.sessionId !== sessionId
      ) {
        finishAttemptForSecurity(
          "Se detecto otra ventana con este examen. El intento se finalizo automaticamente."
        );
      }
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === lockKey && event.newValue && event.newValue !== sessionId) {
        finishAttemptForSecurity(
          "Se detecto otra ventana con este examen. El intento se finalizo automaticamente."
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        finishAttemptForSecurity(
          "Saliste de la pestana del examen. El intento se finalizo automaticamente.",
          { beacon: true }
        );
      }
    };

    const handleBlur = () => {
      finishAttemptForSecurity(
        "La ventana del examen perdio el foco. El intento se finalizo automaticamente."
      );
    };

    const handlePageHide = () => {
      finishAttemptForSecurity(
        "Se abandono la pagina del examen. El intento se finalizo automaticamente.",
        { beacon: true }
      );
    };

    const handlePopState = () => {
      finishAttemptForSecurity(
        "Usaste el boton de volver durante el examen. El intento se finalizo automaticamente.",
        { beacon: true }
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const browserShortcut =
        (event.ctrlKey || event.metaKey) && ["l", "n", "t", "w"].includes(key);

      if (browserShortcut) {
        event.preventDefault();
        finishAttemptForSecurity(
          "Se intento usar un atajo para salir del examen. El intento se finalizo automaticamente."
        );
      }
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(armUnmountTimer);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown, true);

      if (window.localStorage.getItem(lockKey) === sessionId) {
        window.localStorage.removeItem(lockKey);
      }
      channel?.close();

      if (shouldFinalizeOnUnmount && !finalizingRef.current) {
        finalizingRef.current = true;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

        if (navigator.sendBeacon) {
          const body = new Blob(["{}"], { type: "application/json" });
          navigator.sendBeacon(`/api/intentos/${activeAttempt.id}/finalizar`, body);
        } else {
          void finishQuizAttemptAction(activeAttempt.id).catch((error) => {
            console.error("Error al finalizar intento al salir:", error);
          });
        }
      }
    };
  }, [activeAttempt, finishAttemptForSecurity, mediaStatus]);

  // ─── useEffect: countdown del timer ──────────────────────────────────────

  useEffect(() => {
    if (mediaStatus !== "granted" || !activeAttempt) return;

    const updateCountdown = () => {
      const nextRemaining = getActiveAttemptRemainingSeconds(activeAttempt, duracionEstimada);
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        finishAttemptForSecurity(
          "Se acabo el tiempo del examen. El intento se finalizo automaticamente."
        );
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeAttempt, duracionEstimada, finishAttemptForSecurity, mediaStatus]);

  // ─── useEffect: snapshots periódicos de cámara ────────────────────────────

  useEffect(() => {
    if (mediaStatus !== "granted" || !activeAttempt) return;

    let stopped = false;
    let timeoutId: number | undefined;

    const scheduleNextSnapshot = () => {
      const minSeconds = proctoringConfig.captureMinSeconds;
      const maxSeconds = Math.max(minSeconds, proctoringConfig.captureMaxSeconds);
      const delaySeconds = minSeconds + Math.random() * (maxSeconds - minSeconds);

      timeoutId = window.setTimeout(async () => {
        await uploadProctoringSnapshot();
        if (!stopped) scheduleNextSnapshot();
      }, delaySeconds * 1000);
    };

    scheduleNextSnapshot();

    return () => {
      stopped = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeAttempt, mediaStatus, proctoringConfig, uploadProctoringSnapshot]);

  // ─── useEffect: polling de estado de proctoring ───────────────────────────

  useEffect(() => {
    if (mediaStatus !== "granted" || !activeAttempt) return;

    const checkAttemptStatus = async () => {
      try {
        const response = await fetch(
          `/api/intentos/${activeAttempt.id}/proctoring/status`,
          { cache: "no-store" }
        );
        if (!response.ok) return;

        const data = (await response.json()) as {
          paused?: boolean;
          canceled?: boolean;
          estado?: string;
        };

        if (data.paused || data.estado === "PAUSADO_REVISION_IA") {
          // El admin bloqueó el examen manualmente
          setActiveFaultWarning({
            isBlocking: true,
            tipo: "camara",
            faultCount: 2,
            descripcion: "El profesor ha bloqueado tu examen para revisión.",
          });
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } else if (data.canceled || data.estado === "CANCELADO_CONFIRMADO") {
          finishAttemptForSecurity(
            "Tu examen fue cancelado tras la revisión del profesor.",
            { beacon: true }
          );
        }
      } catch (error) {
        console.error("Error al consultar estado de proctoring:", error);
      }
    };

    const intervalId = window.setInterval(checkAttemptStatus, 5000);
    return () => window.clearInterval(intervalId);
  }, [activeAttempt, finishAttemptForSecurity, mediaStatus]);

  // ─── useEffect: detección de ruido en tiempo real ────────────────────────

  useEffect(() => {
    if (mediaStatus !== "granted" || !activeAttempt || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    let animFrameId: number;

    const analyse = () => {
      analyser.getFloatTimeDomainData(buffer);
      const rms = calcRms(buffer);
      setNoiseLevelRms(rms);

      const threshold = noiseBaselineRef.current * NOISE_RMS_MULTIPLIER;
      const isAbove = rms > threshold && threshold > 0;
      setNoiseIsAboveThreshold(isAbove);

      if (isAbove && !noiseCooldownRef.current) {
        const now = Date.now();
        lastNoiseTimeRef.current = now;

        if (noiseAboveStartRef.current === null) {
          noiseAboveStartRef.current = now;
        }

        const sustainedMs = now - noiseAboveStartRef.current;

        // Criterio 1: Ruido acumulado/sostenido (3 segundos, ignorando pausas breves de <600ms)
        const isSustainedViolated = sustainedMs >= NOISE_SUSTAINED_MS;

        // Criterio 2: Ráfagas cortas repetidas (3 o más ráfagas de >800ms en una ventana de 25s)
        let isBurstViolated = false;
        if (sustainedMs >= 800) {
          const recentBursts = noiseBurstTimesRef.current.filter((t) => now - t <= 25000);
          if (!recentBursts.some((t) => now - t < 1500)) {
            recentBursts.push(now);
            noiseBurstTimesRef.current = recentBursts;
          }
          if (recentBursts.length >= 3) {
            isBurstViolated = true;
          }
        }

        if ((isSustainedViolated || isBurstViolated) && !noiseRecorderRef.current && mediaStreamRef.current) {
          noiseAboveStartRef.current = null;
          lastNoiseTimeRef.current = null;
          noiseBurstTimesRef.current = [];
          noiseCooldownRef.current = true;

          const audioOnlyStream = new MediaStream(
            mediaStreamRef.current.getAudioTracks()
          );

          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

          const recorder = new MediaRecorder(audioOnlyStream, { mimeType });
          noiseChunksRef.current = [];
          noiseRecorderRef.current = recorder;
          setNoiseIsRecording(true);

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) noiseChunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(noiseChunksRef.current, { type: mimeType });
            noiseRecorderRef.current = null;
            noiseChunksRef.current = [];
            setNoiseIsRecording(false);
            void sendNoiseRecording(blob);

            // Liberar cooldown después del período definido
            window.setTimeout(() => {
              noiseCooldownRef.current = false;
            }, NOISE_COOLDOWN_MS);
          };

          recorder.start();
          window.setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
          }, NOISE_RECORDING_MS);
        }
      } else {
        // Tolerancia a pausas naturales al hablar (Speech Hangover):
        // Solo reseteamos el temporizador si transcurren más de 600ms de silencio continuo.
        const now = Date.now();
        if (lastNoiseTimeRef.current && now - lastNoiseTimeRef.current > 600) {
          noiseAboveStartRef.current = null;
          lastNoiseTimeRef.current = null;
        }
      }

      animFrameId = requestAnimationFrame(analyse);
    };

    animFrameId = requestAnimationFrame(analyse);
    animationFrameRef.current = animFrameId;

    return () => cancelAnimationFrame(animFrameId);
  }, [activeAttempt, mediaStatus, sendNoiseRecording]);

  // ─── Guardado de respuestas ───────────────────────────────────────────────

  const handleSaveAnswer = async (
    preguntaId: string,
    data: { opcionId?: string | null; respuestaAbierta?: string | null }
  ) => {
    if (!activeAttempt) return;

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

    setSavingMap((prev) => ({ ...prev, [preguntaId]: true }));

    try {
      await saveAnswerAction(activeAttempt.id, preguntaId, {
        opcionId: data.opcionId,
        respuestaAbierta: data.respuestaAbierta,
      });
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
    if (!activeAttempt) return;
    startSubmitTransition(async () => {
      try {
        await submitQuizAction(activeAttempt.id);
      } catch (e) {
        console.error("Error al enviar el cuestionario:", e);
      }
    });
  };

  // ─── Valores derivados ────────────────────────────────────────────────────

  const isSavingAny = Object.values(savingMap).some(Boolean);

  const totalRespondidas = preguntas.filter((p) => {
    const res = respuestas[p.id];
    if (!res) return false;
    if (p.tipo === "OPCION_MULTIPLE") return !!res.opcionId;
    if (p.tipo === "ABIERTA") return !!res.respuestaAbierta && res.respuestaAbierta.trim() !== "";
    return false;
  }).length;

  const porcentajeProgreso =
    preguntas.length > 0 ? (totalRespondidas / preguntas.length) * 100 : 0;
  const porcentajeTiempo =
    totalDurationSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / totalDurationSeconds) * 100))
      : 0;

  const isTimeCritical = remainingSeconds <= 60;
  const isTimeWarning = remainingSeconds <= 300;
  const timerBadgeClass = isTimeCritical
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : isTimeWarning
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  const timerBarClass = isTimeCritical
    ? "bg-destructive"
    : isTimeWarning
      ? "bg-warning"
      : "bg-emerald-500";

  // ─── Renders de estado ────────────────────────────────────────────────────

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

  if (violationMessage) {
    return (
      <Card className="border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground">Intento finalizado</h3>
        <p className="text-sm text-muted-foreground mt-2 mb-6">{violationMessage}</p>
        <Button disabled className="rounded-xl">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Guardando intento...
        </Button>
      </Card>
    );
  }

  if (mediaStatus === "calibrating") {
    return (
      <Card className="mx-auto w-full max-w-3xl border border-primary/40 bg-primary/5 p-8 sm:p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/40 bg-background/80 text-primary shadow-sm">
          <Mic className="h-9 w-9 animate-pulse" />
        </div>
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
          Calibrando tu ambiente
        </h3>
        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
          Por favor mantén <strong>silencio</strong> durante unos segundos mientras
          registramos el nivel de ruido de tu entorno. Esto garantiza una detección
          justa sin importar tu dispositivo.
        </p>
        <div className="mx-auto mt-8 max-w-sm space-y-2">
          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${calibrationProgress}%` }}
            />
          </div>
          <span className="block text-xs text-right font-bold text-muted-foreground uppercase tracking-wider">
            {calibrationProgress}% completado
          </span>
        </div>
      </Card>
    );
  }

  if (mediaStatus !== "granted") {
    const isChecking = mediaStatus === "checking";
    const isUnsupported = mediaStatus === "unsupported";

    return (
      <Card className="mx-auto w-full max-w-5xl border border-warning/40 bg-warning/10 p-8 text-center shadow-lg sm:p-10 lg:p-14">
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-warning/40 bg-background/80 text-warning shadow-sm">
          <Camera className="h-9 w-9" />
          <Mic className="ml-1.5 h-7 w-7" />
        </div>
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Camara y microfono requeridos
        </h3>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          Para iniciar este examen debes conceder acceso a la camara y al
          microfono. Si no das permiso, no podras responderlo.
        </p>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 text-left">
          <div className="flex items-start gap-5 rounded-2xl border border-primary/40 bg-primary/10 p-5 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-foreground">Monitoreo con IA</p>
              <p className="text-base leading-7 text-muted-foreground">
                Durante el examen una IA revisara capturas periodicas de la camara para
                detectar posibles irregularidades. Tienes un máximo de 2 advertencias
                antes de que tu examen sea bloqueado.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-foreground">Aviso de seguridad del examen</p>
              <p className="text-base leading-7 text-muted-foreground">
                Si cambias de pestana, abres otra ventana, sales del navegador o el examen
                pierde el foco, el intento se finalizara automaticamente con las respuestas
                guardadas hasta ese momento.
              </p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          className="mt-9 h-12 w-full max-w-4xl rounded-xl text-base font-bold"
          onClick={() => void requestMediaAccess()}
          disabled={isChecking || isUnsupported}
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Solicitando permisos...
            </>
          ) : isUnsupported ? (
            "Navegador no compatible"
          ) : (
            "Permitir camara y microfono"
          )}
        </Button>
      </Card>
    );
  }

  // ─── Render principal del examen ──────────────────────────────────────────

  return (
    <>
      {/* Modal de advertencia de faltas */}
      <FaultWarningModal
        warning={activeFaultWarning}
        onClose={() => setActiveFaultWarning(null)}
        onGoHome={() => router.replace("/usuario/cuestionarios")}
      />

      <div className="space-y-6">
        <video ref={videoRef} muted playsInline autoPlay className="sr-only" aria-hidden="true" />

        {/* Header sticky con progreso */}
        <header className="sticky top-[55px] z-40 bg-card/85 backdrop-blur-xl border border-border/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0 cursor-pointer"
              onClick={() => {
                finishAttemptForSecurity(
                  "Usaste el boton de volver durante el examen. El intento se finalizo automaticamente.",
                  { beacon: true }
                );
                if (historyGuardPushedRef.current) {
                  window.history.back();
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-base md:text-lg line-clamp-1 text-foreground">
                {cuestionario.titulo}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground/80 shrink-0">
                  {totalRespondidas} de {preguntas.length} respondidas
                </span>
                <span className="shrink-0">•</span>
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-bold shrink-0 ${timerBadgeClass}`}
                >
                  <Clock3 className="h-3 w-3" />
                  Tiempo: {formatCountdown(remainingSeconds)}
                </span>
                <span className="shrink-0">/</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400 shrink-0">
                  <Camera className="h-3 w-3" />
                  Camara activa
                </span>
                <span className="shrink-0">/</span>
                {/* Medidor de nivel de micrófono */}
                <NoiseMeter
                  rms={noiseLevelRms}
                  baseline={noiseBaselineRef.current}
                  isAbove={noiseIsAboveThreshold}
                  isRecording={noiseIsRecording}
                />
                <span className="shrink-0">/</span>
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

          {/* Barras de progreso */}
          <div className="w-full sm:w-56 flex flex-col gap-2 shrink-0">
            <div className="space-y-1">
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${porcentajeProgreso}%` }}
                />
              </div>
              <span className="block text-[10px] text-right font-bold text-muted-foreground uppercase tracking-wider">
                {porcentajeProgreso.toFixed(0)}% completado
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${timerBarClass}`}
                  style={{ width: `${porcentajeTiempo}%` }}
                />
              </div>
              <span className="block text-[10px] text-right font-bold text-muted-foreground uppercase tracking-wider">
                {formatDuration(duracionEstimada)} totales
              </span>
            </div>
          </div>
        </header>

        {/* Grid: sidebar de navegación + panel de pregunta */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                    Ponderacion: {preguntaActual.puntos}%
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
                      const letra = String.fromCharCode(65 + oIdx);
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

            {/* Controles de navegación */}
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
                  <DialogTrigger>
                    <Button variant="default" className="rounded-xl font-bold px-6 shadow-md shadow-primary/20 cursor-pointer text-xs h-10">
                      Enviar Cuestionario
                      <CheckCircle2 className="h-4 w-4 ml-1.5 shrink-0" />
                    </Button>
                  </DialogTrigger>
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
    </>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

/** Medidor visual del nivel de ruido del micrófono en tiempo real */
function NoiseMeter({
  rms,
  baseline,
  isAbove,
  isRecording,
}: {
  rms: number;
  baseline: number;
  isAbove: boolean;
  isRecording: boolean;
}) {
  const maxRms = baseline * NOISE_RMS_MULTIPLIER * 1.5;
  const barWidth = maxRms > 0 ? Math.min(100, (rms / maxRms) * 100) : 0;

  return (
    <span className="flex items-center gap-1.5 font-medium shrink-0">
      {isRecording ? (
        <Volume2 className="h-3 w-3 text-destructive animate-pulse" />
      ) : (
        <Mic
          className={`h-3 w-3 transition-colors ${
            isAbove ? "text-destructive animate-pulse" : "text-emerald-400"
          }`}
        />
      )}
      <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            isAbove ? "bg-destructive" : "bg-emerald-400"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {isRecording && (
        <span className="text-destructive text-[9px] font-bold animate-pulse">REC</span>
      )}
    </span>
  );
}

/** Modal de advertencia de falta — no bloqueable si isBlocking === true */
function FaultWarningModal({
  warning,
  onClose,
  onGoHome,
}: {
  warning: FaultWarning | null;
  onClose: () => void;
  onGoHome: () => void;
}) {
  const isOpen = !!warning;
  const isBlocking = warning?.isBlocking ?? false;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Solo permitir cerrar si no está bloqueando
        if (!open && !isBlocking) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!isBlocking}
        className={`rounded-2xl border bg-card/95 backdrop-blur-xl max-w-md w-[95%] ${
          isBlocking
            ? "border-destructive/50 bg-destructive/5"
            : "border-warning/50 bg-warning/5"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {isBlocking ? (
              <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
            )}
            {isBlocking
              ? "Examen bloqueado — Falta 2 de 2"
              : `Advertencia — Falta ${warning?.faultCount ?? 1} de 2`}
          </DialogTitle>
          <DialogDescription render={<div />} className="text-sm text-muted-foreground pt-2 leading-relaxed space-y-3">
            <span className="block p-3 rounded-xl border border-border/60 bg-secondary/30 text-xs font-semibold text-foreground space-y-1 text-left">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block tracking-wider">
                {isBlocking
                  ? `Motivo de la 2ª incidencia — Provocó el bloqueo (${warning?.tipo === "ruido" ? "Audio / Micrófono" : "Cámara / Monitoreo Visual"})`
                  : `Motivo de la 1ª falta (${warning?.tipo === "ruido" ? "Audio / Micrófono" : "Cámara / Monitoreo Visual"})`}
              </span>
              <span className="block text-sm font-medium text-foreground">{warning?.descripcion}</span>
            </span>
            {isBlocking ? (
              <span className="block font-semibold text-destructive text-left">
                Tu examen ha sido bloqueado. Actualmente tienes calificación
                reprobatoria hasta que el profesor revise las evidencias y decida
                si lo desbloquea.
              </span>
            ) : (
              <span className="block font-semibold text-amber-500 text-left">
                Esta es tu primera advertencia. Si acumulas una más, tu examen
                será bloqueado para revisión del profesor.{" "}
                <strong>El tiempo sigue corriendo.</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          {isBlocking ? (
            <Button
              variant="destructive"
              className="w-full rounded-xl font-bold"
              onClick={onGoHome}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>
          ) : (
            <Button
              variant="default"
              className="w-full rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
              onClick={onClose}
            >
              Entendido, continuar →
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
