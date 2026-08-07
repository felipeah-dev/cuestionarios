# Justificación Técnica — Sistema de Detección de Ruido Excesivo

## Contexto del Problema

La aplicación de proctoring requiere detectar si un alumno está realizando su examen en un ambiente ruidoso inaceptable (por ejemplo, con personas hablando cerca), usando únicamente el **micrófono del navegador** y sin depender de ninguna IA externa. Si el ruido excesivo se sostiene por **3 segundos continuos**, el sistema genera una alerta que cuenta como una "falta" dentro del sistema de 2 faltas máximas.

---

## 1. ¿Cuál es el nivel de ruido que consideramos inaceptable?

### Referencia académica

El límite entre un ambiente silencioso aceptable para un examen y uno inaceptable está establecido en **35 dB(A)** por dos organismos internacionales de referencia:

| Norma / Organismo | Límite establecido | Aplicación |
|---|---|---|
| **ANSI/ASA S12.60-2002/2010** | ≤ 35 dB(A) en aulas desocupadas | Diseño acústico de escuelas en EE.UU. |
| **OMS — Guías de Ruido Comunitario** | < 35 dB(A) dentro de aulas | Condiciones óptimas de enseñanza y aprendizaje |
| **LEED (U.S. Green Building Council)** | < 35 dB(A) de ruido de fondo general | Construcción de escuelas sostenibles |
| **ISO 9921:2003** | Nivel de inteligibilidad "Bueno" para comunicación prolongada | Ergonomía de la comunicación hablada (exámenes, conferencias) |

Adicionalmente, la **ISO 9921** establece que una conversación masculina normal con esfuerzo vocal "Normal" produce **60 dB(A) a 1 metro de distancia** y **54 dB(A) a 2 metros**. Esto significa que la diferencia entre un ambiente de examen aceptable y una conversación cercana es de aproximadamente **+15 a +25 dB**.

### Umbral de alerta elegido

Tomando como base estas normas, el umbral de alerta para el sistema se establece conceptualmente en **> 50 dB(A)** — punto medio entre el límite aceptable (35 dB(A)) y una conversación cercana (54–60 dB(A)). A este nivel el ruido ya es claramente disruptivo según los estudios referenciados en ANSI S12.60.

---

## 2. El problema técnico: dBFS vs. dB(A) SPL

### ¿Por qué no podemos usar un umbral fijo?

La **Web Audio API** de los navegadores no mide decibeles absolutos (dB SPL o dB(A)). Opera en **dBFS (Decibels relative to Full Scale)**, una escala relativa donde:

- `0 dBFS` = el límite digital máximo del micrófono del dispositivo (amplitud PCM de 1.0).
- Todos los sonidos se expresan como valores **negativos** en dBFS (p. ej., `-20 dBFS`, `-40 dBFS`).

El valor que registra un micrófono en dBFS depende completamente de:
- La **sensibilidad del hardware** del micrófono.
- Los **preamplificadores analógicos** del dispositivo.
- Los **convertidores ADC** (analógico-digital).
- El **nivel de ganancia** configurado en el sistema operativo.

> **Consecuencia directa**: Dos laptops en la misma habitación, con el mismo nivel de ruido real, registrarán valores de dBFS **drásticamente distintos**. Un umbral fijo de RMS `0.10` podría disparar la alerta en una laptop y no en otra, haciendo el sistema injusto.

### El problema del AGC (Control Automático de Ganancia)

Los navegadores habilitan por defecto el **AGC (autoGainControl)** al solicitar el micrófono. Este mecanismo:
- **Sube la ganancia** del micrófono cuando el ambiente está en silencio.
- **Baja la ganancia** cuando el usuario empieza a hablar.

Esto destruiría cualquier sistema de calibración: el nivel base medido en silencio sería artificialmente bajo, y cuando el usuario hable el AGC lo compensaría, haciendo que el RMS actual sea similar al baseline y la alerta nunca se dispare correctamente.

---

## 3. La solución implementada

### 3.1. Desactivar el AGC al solicitar el micrófono

Al iniciar el examen, el navegador solicita el micrófono con las siguientes restricciones explícitas para preservar la señal real de audio:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: {
    autoGainControl: false,      // Desactiva el ajuste automático de ganancia
    noiseSuppression: false,     // Desactiva el filtro de ruido (no queremos alterar la señal)
    echoCancellation: false,     // Desactiva la cancelación de eco
  },
});
```

Con esto, la señal de audio refleja fielmente el sonido real del entorno del alumno.

### 3.2. Calibración dinámica del ruido base (Noise Floor Calibration)

En lugar de usar un umbral fijo, el sistema **aprende el nivel de ruido de fondo del entorno específico de cada alumno** al inicio del examen:

**Durante los primeros 5 segundos**, antes de que el timer del examen comience, se muestra una pantalla de calibración que pide al alumno que guarde silencio. Durante ese tiempo, el sistema:

1. Usa un `AnalyserNode` de la Web Audio API.
2. Extrae datos con `getFloatTimeDomainData()` en un `Float32Array`.
3. Calcula el **RMS (Root Mean Square)** de cada bloque de muestras:
   ```ts
   let sumOfSquares = 0;
   for (let i = 0; i < buffer.length; i++) {
     sumOfSquares += buffer[i] ** 2;
   }
   const blockRms = Math.sqrt(sumOfSquares / buffer.length);
   ```
4. Promedia todos los bloques de los 5 segundos para obtener el `noiseFloorRMS`.

Este `noiseFloorRMS` representa el nivel de ruido de fondo **real** de ese alumno en ese dispositivo y en ese momento.

### 3.3. Umbral dinámico de alerta

El umbral de alerta se calcula como:

```
alertThresholdRMS = noiseFloorRMS × 5.62
```

El factor **5.62** proviene de la conversión matemática de **+15 dB** a escala lineal:

```
factor = 10^(15/20) = 10^0.75 ≈ 5.62
```

Este margen de +15 dB está justificado por las normas consultadas:
- Ambiente aceptable: ≤ 35 dB(A) (ANSI S12.60, OMS)
- Conversación a 2 metros: ~54 dB(A) (ISO 9921)
- Diferencia: +19 dB → redondeamos a +15 dB para ser conservadores y evitar falsos positivos

### 3.4. Detección sostenida con protección contra picos transitorios

El sistema no dispara la alerta por un único pico de ruido. Requiere que el nivel supere el umbral **de forma sostenida durante 3 segundos continuos**. Si el ruido baja antes de los 3 segundos, el timer se reinicia. Esto filtra eventos transitorios como:

- Tos o estornudo (< 1 segundo).
- Golpe en el escritorio.
- Clic de teclado.

Solo una conversación real o ruido sostenido activa la alerta.

### 3.5. Cooldown de 30 segundos entre alertas de ruido

Una vez disparada una alerta de ruido, el sistema entra en un período de espera de **30 segundos** antes de poder registrar una nueva falta de ruido. Esto evita que un ambiente constantemente ruidoso genere múltiples alertas en cascada antes de que el alumno pueda reaccionar al modal de advertencia.

---

## 4. Flujo técnico completo

```
requestMediaAccess()
│
├─ getUserMedia({ autoGainControl: false, ... })
│
├─ CALIBRACIÓN (5 segundos)
│    AnalyserNode → getFloatTimeDomainData() cada frame
│    Acumular sumas de cuadrados
│    noiseFloorRMS = √(sumOfSquares / totalSamples)
│    alertThresholdRMS = noiseFloorRMS × 5.62
│    setMediaStatus("granted") → inicia el examen
│
└─ DETECCIÓN CONTINUA (requestAnimationFrame, cada ~16ms)
     rmsActual = calcRMS(currentBuffer)
     setNoiseLevelRms(rmsActual)  ← actualiza barra visual

     ¿rmsActual > alertThresholdRMS?
        No → resetear timer de 3s, barra verde
        Sí → barra naranja/roja pulsando
              ¿Timer >= 3000ms?
                 No → continuar
                 Sí → MediaRecorder.start()
                       grabar 5s
                       POST /api/intentos/[id]/proctoring/noise
                       → falta registrada
                       Cooldown 30s
```

---

## 5. Evidencias almacenadas

Cuando se detecta un evento de ruido, el sistema guarda:

1. **Grabación de audio** (5 segundos, formato WebM/Opus) en:
   ```
   storage/proctoring/<nombreAlumno>/<intentoId>/ruido-<timestamp>.webm
   ```

2. **Registro en base de datos** (`AlertaProctoring`):
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
       "agc_disabled": true
     }
   }
   ```

Esta evidencia queda disponible para que el profesor la revise antes de decidir si desbloquea el examen o confirma la reprobación.

---

## 6. Limitaciones conocidas

| Limitación | Impacto | Mitigación |
|---|---|---|
| Si el alumno hace ruido durante la calibración | El baseline queda alto y el sistema será menos sensible | La pantalla de calibración pide explícitamente silencio |
| Micrófonos de muy baja calidad o saturados | El AGC desactivado puede producir señales distorsionadas | El sistema sigue funcionando; solo cambia la sensibilidad |
| Picos transitorios muy prolongados (> 3s) como música de fondo | Podrían disparar una alerta legítima | Es el comportamiento deseado — música durante examen es una irregularidad |
| El alumno puede tapar el micrófono | El baseline baja y el umbral baja con él | Esta limitación aplica a cualquier sistema basado en audio |

---

## 7. Referencias

- **ANSI/ASA S12.60-2002/2010** — Acoustical Performance Criteria, Design Requirements, and Guidelines for Schools.
- **OMS — Guías para el ruido comunitario** (Berglund, Lindvall, Schwela, 1999).
- **ISO 9921:2003** — Ergonomics of human-system interaction: Assessment of speech communication.
- **LEED for Schools (U.S. Green Building Council)** — Environmental Quality Credit: Acoustic Performance.
- **Web Audio API Specification** — W3C, `AnalyserNode`, `getFloatTimeDomainData()`.
- **MediaTrackConstraints.autoGainControl** — MDN Web Docs.
