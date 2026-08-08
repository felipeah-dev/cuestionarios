# Justificación Técnica — Sistema de Detección de Ruido Excesivo

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

### 2.1. Señal ambiental completa
El analizador recibe la señal completa del micrófono. Esto permite detectar voz,
golpes, música y otros sonidos elevados sin que un filtro estrecho los descarte:

```ts
const audioCtx = new AudioContext();
const source = audioCtx.createMediaStreamSource(stream);

const analyser = audioCtx.createAnalyser();
analyser.smoothingTimeConstant = 0.2;
source.connect(analyser);
```

### 2.2. Captura sin supresión
El procesamiento automático se desactiva porque suprimir el ruido antes de medirlo
impediría detectar la conducta que se quiere supervisar:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: {
    autoGainControl: false,
    noiseSuppression: false,
    echoCancellation: false,
  },
});
```

---

## 3. Parámetros de Sensibilidad y Calibración

### 3.1. Piso Mínimo RMS y Umbral Dinámico
Para capturar desde **voz hablada regular** hasta **susurros y murmullos**, el sistema utiliza un piso mínimo absoluto y un multiplicador ajustado sobre el silencio calibrado:

- **`MIN_NOISE_RMS_FLOOR = 0.005`**: Piso mínimo compatible con micrófonos de señal baja.
- **`NOISE_DB_OVER_BASELINE = 4 dB` (+1.58x)**: El umbral se activa al superar en 4 dB la mediana del ambiente calibrado.

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
├─ getUserMedia({ noiseSuppression: false, echoCancellation: false })
│
├─ CALIBRACIÓN (5 segundos iniciales)
│    AudioContext → MediaStreamSource → AnalyserNode
│    Calcular la mediana RMS del silencio base (noiseFloorRMS)
│
└─ DETECCIÓN CONTINUA (requestAnimationFrame)
     rmsActual = calcRMS(currentBuffer)
     threshold = Math.max(noiseFloorRMS * 1.58, 0.005)
     
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

1. **Evidencia de audio (5 segundos)** en una carpeta privada de Google Drive:
   ```text
   <nombreAlumno>-<intentoId>-ruido-<timestamp>.<webm|ogg|m4a>
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
       "agc_disabled": true,
       "descripcion_breve": "Se detectó ruido excesivo o habla continua en el micrófono (+4 dB sobre el nivel base de silencio)."
     }
   }
   ```

---

## 6. Referencias Técnicas

- **ANSI/ASA S12.60-2002/2010** — Acoustical Performance Criteria and Design Requirements for Schools.
- **OMS — Guías para el ruido comunitario** (Berglund, Lindvall, Schwela, 1999).
- **ISO 9921:2003** — Ergonomics of human-system interaction: Assessment of speech communication.
- **Web Audio API Specification (W3C)** — `BiquadFilterNode`, `AnalyserNode`, `getFloatTimeDomainData()`.
