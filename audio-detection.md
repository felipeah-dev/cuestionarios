# Justificación Técnica — Sistema de Detección de Ruido Excesivo y Filtrado Vocal

## Contexto del Problema

La aplicación de proctoring requiere detectar si un alumno está realizando su examen en un ambiente ruidoso inaceptable (por ejemplo, con personas hablando, susurrando o leyendo preguntas en voz alta), usando únicamente el **micrófono del navegador** y sin depender de ninguna IA externa de audio. 

Si el ruido vocal excesivo se sostiene por **3 segundos continuos** (o en ráfagas repetidas), el sistema genera una alerta que cuenta como una "falta" dentro del sistema de 2 faltas máximas antes del bloqueo.

---

## 1. Nivel de Ruido y Frecuencias Inaceptables

### Referencia académica y espectro vocal

El límite entre un ambiente silencioso aceptable para un examen y uno inaceptable está establecido en **35 dB(A)** por organismos internacionales:

| Norma / Organismo | Límite establecido | Aplicación |
|---|---|---|
| **ANSI/ASA S12.60-2002/2010** | ≤ 35 dB(A) en aulas desocupadas | Diseño acústico de escuelas en EE.UU. |
| **OMS — Guías de Ruido Comunitario** | < 35 dB(A) dentro de aulas | Condiciones óptimas de enseñanza y aprendizaje |
| **ISO 9921:2003** | Nivel de inteligibilidad para voz humana | Ergonomía de la comunicación hablada |

Adicionalmente, el rango de frecuencias de la **voz humana (hablada y susurrada)** se encuentra acotado entre **300 Hz y 3400 Hz**. Los ruidos mecánicos (tecleos de laptops, teclados externos o clics de mouse) generan impulsos agudos superiores a **4000 Hz** o impactos graves por debajo de **150 Hz**.

---

## 2. La Arquitectura de Audio Implementada

### 2.1. Filtro Pasa-Banda Vocal (`BiquadFilterNode`)
Para aislar la voz humana y descartar completamente el tecleo de laptop/teclado mecánico, la cadena de audio de la Web Audio API utiliza un **filtro pasa-banda vocal**:

```ts
const audioCtx = new AudioContext();
const source = audioCtx.createMediaStreamSource(stream);

// Filtro Pasa-Banda Vocal (300 Hz a 3400 Hz)
const bandpass = audioCtx.createBiquadFilter();
bandpass.type = "bandpass";
bandpass.frequency.value = 1850; // Frecuencia central de formantes de voz
bandpass.Q.value = 0.75; // Ancho de banda espectral para cubrir 300Hz-3400Hz

const analyser = audioCtx.createAnalyser();
source.connect(bandpass);
bandpass.connect(analyser);
```

### 2.2. Supresión de Ruido Nativa de WebRTC
Al solicitar acceso a medios, se activan los algoritmos de cancelación de ruido del navegador para filtrar zumbidos y clics mecánicos:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: {
    autoGainControl: true,
    noiseSuppression: true,   // Elimina clics mecánicos y ruido blanco de fondo
    echoCancellation: true,
  },
});
```

---

## 3. Parámetros de Sensibilidad y Calibración

### 3.1. Piso Mínimo RMS y Umbral Dinámico
Para capturar desde **voz hablada regular** hasta **susurros y murmullos**, el sistema utiliza un piso mínimo absoluto y un multiplicador ajustado sobre el silencio calibrado:

- **`MIN_NOISE_RMS_FLOOR = 0.012`**: Piso de volumen mínimo para detectar voz baja y susurros cerca del micrófono.
- **`NOISE_DB_OVER_BASELINE = 6 dB` (+2.0x)**: El umbral dinámico se activa si la voz supera en 6 dB el silencio base del entorno.

```ts
const rawThreshold = noiseBaselineRef.current * NOISE_RMS_MULTIPLIER;
const threshold = Math.max(rawThreshold, MIN_NOISE_RMS_FLOOR);
const isAbove = rms > threshold;
```

### 3.2. Criterios de Disparo de Falta
1. **Ruido Vocal Sostenido (3 Segundos):**  
   Requiere 3000 ms continuos de voz sobre el umbral. Incluye un **Speech Hangover de 600 ms** para no reiniciar el conteo durante las pausas naturales al hablar entre palabras.
2. **Ráfagas Repetidas:**  
   3 o más ráfagas de voz mayores a 800 ms dentro de una ventana de 25 segundos.

### 3.3. Cooldown de 5 Segundos
Una vez registrada una falta de ruido y grabados los 5 segundos de audio `.webm` como evidencia, se aplica un **cooldown de 5 segundos (`5000 ms`)**. Esto evita cascadas infinitas sin dejar ventanas largas de impunidad para el alumno.

---

## 4. Flujo Técnico Completo

```
requestMediaAccess()
│
├─ getUserMedia({ noiseSuppression: true, echoCancellation: true })
│
├─ CALIBRACIÓN (5 segundos iniciales)
│    AudioContext → MediaStreamSource → BiquadFilterNode (300Hz-3400Hz) → AnalyserNode
│    Promediar RMS de silencio base (noiseFloorRMS)
│
└─ DETECCIÓN CONTINUA (requestAnimationFrame)
     rmsActual = calcRMS(currentBuffer)
     threshold = Math.max(noiseFloorRMS * 2.0, 0.012)
     
     ¿rmsActual > threshold?
        No → Speech hangover (600ms de gracia), luego resetear timer
        Sí → ¿Voz sostenida >= 3000ms o 3 ráfagas en 25s?
               Sí → MediaRecorder.start()
                     Grabar 5s audio .webm
                     POST /api/intentos/[id]/proctoring/noise
                     Cooldown de 5 segundos
```

---

## 5. Evidencias Almacenadas

Cuando se confirma una falta de ruido, el sistema almacena:

1. **Evidencia de audio `.webm` (5 segundos)** en:
   ```text
   storage/proctoring/<nombreAlumno>/<intentoId>/ruido-<timestamp>.webm
   ```

2. **Registro en Base de Datos (`AlertaProctoring`)**:
   ```json
   {
     "tipoEvidencia": "GRABACION_RUIDO",
     "nivelAlerta": "ALTO",
     "modelUsed": "noise-detector-client-rms",
     "confianza": 1.0,
     "aiResultJson": {
       "detection_method": "web_audio_api_rms",
       "noise_above_baseline": true,
       "sustained_seconds": 3,
       "agc_disabled": false,
       "descripcion_breve": "Se detectó ruido excesivo o habla continua en el micrófono (+15 dB sobre el nivel base de silencio)."
     }
   }
   ```

---

## 6. Referencias Técnicas

- **ANSI/ASA S12.60-2002/2010** — Acoustical Performance Criteria and Design Requirements for Schools.
- **OMS — Guías para el ruido comunitario** (Berglund, Lindvall, Schwela, 1999).
- **ISO 9921:2003** — Ergonomics of human-system interaction: Assessment of speech communication.
- **Web Audio API Specification (W3C)** — `BiquadFilterNode`, `AnalyserNode`, `getFloatTimeDomainData()`.
