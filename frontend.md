# Sistema de Diseño de Cuestionarios Académicos

Este documento define las directrices y estándares visuales del proyecto. Todos los miembros del equipo deben seguir estas convenciones para mantener la consistencia estética y funcional de la plataforma.

---

## 1. Paleta de Colores (OKLCH Semánticos)

La aplicación utiliza variables CSS basadas en el espacio de color **OKLCH** (estándar en Tailwind CSS v4) para garantizar colores armónicos, accesibilidad de lectura y transiciones fluidas de tema (Claro / Oscuro).

| Variable CSS | Color en Claro | Color en Oscuro | Propósito de Uso |
| :--- | :--- | :--- | :--- |
| `--background` | Gris azulado suave | Slate profundo | Fondo general de las páginas. Diseñado para evitar fatiga visual durante exámenes largos. |
| `--foreground` | Slate oscuro (casi negro) | Gris muy claro | Texto principal y cuerpo de lectura. Ofrece un alto contraste. |
| `--card` | Blanco puro | Slate intermedio | Fondo de cuestionarios, bloques de preguntas y formularios. |
| `--primary` | Índigo Académico (Azul) | Violeta suave | Color de marca/identidad. Usado para headers, botones primarios e inputs activos. |
| `--secondary` | Gris neutro | Slate oscuro | Botones secundarios, bordes sutiles e indicadores neutros. |
| `--muted-foreground`| Gris medio | Slate grisáceo | Subtítulos, textos de ayuda y descripciones secundarias. |
| `--destructive` | Rojo / Rosa fuerte | Rojo encendido | Acciones destructivas (eliminar) y respuestas erróneas (Incorrecto). |
| `--success` | Esmeralda | Verde claro | Acciones de éxito (Guardado), respuestas correctas. |
| `--warning` | Ámbar | Amarillo suave | Estados pendientes (Pendiente de calificar por administrador). |

---

## 2. Tipografía y Jerarquía Visual

La fuente principal es **Geist Sans** (definida en el layout a través del alias `font-sans`). Es una fuente sans-serif geométrica altamente legible para lectura continua en pantallas digitales.

### Tamaños y Pesos Estándar
- **Título de Cuestionario / H1**: `text-3xl` (`30px`), peso `font-extrabold` (`tracking-tight`).
- **Título de Pregunta / Sección (H2)**: `text-xl` (`20px`), peso `font-bold` o `font-semibold`.
- **Cuerpo de la Pregunta / Enunciado**: `text-base` (`16px`), peso `font-normal`.
- **Opciones de Respuesta**: `text-sm` (`14px`), peso `font-medium`.
- **Textos Secundarios / Meta-información**: `text-xs` (`12px`), peso `font-medium` o `font-normal` con `text-muted-foreground`.

---

## 3. Responsive Design y Breakpoints

La plataforma es mobile-first. Los cuestionarios deben ser totalmente cómodos de contestar en móviles.

### Breakpoints Definidos:
- **Móvil (base)**: `< 640px` (Layout de una sola columna, menús colapsables).
- **Tablet (`sm` / `md`)**: `640px` a `768px` (Contenedores con padding reducido, listas condensadas).
- **Desktop (`lg` / `xl`)**: `1024px` a `1280px` (Layouts de dos columnas, sidebar + panel principal).

### Ejemplos prácticos en Tailwind:
```tsx
// Grid responsivo para las opciones de respuesta de una pregunta
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div>Opción A</div>
  <div>Opción B</div>
</div>
```

---

## 4. Catálogo de Componentes shadcn/ui

Los siguientes componentes están instalados y disponibles bajo `@/components/ui`:

1. **Button** (`button.tsx`): Botón interactivo para acciones.
   ```tsx
   import { Button } from "@/components/ui/button"
   <Button variant="default">Siguiente Pregunta</Button>
   ```
2. **Input** (`input.tsx`): Control de texto para login y respuestas abiertas.
   ```tsx
   import { Input } from "@/components/ui/input"
   <Input type="email" placeholder="Correo electrónico" />
   ```
3. **Card** (`card.tsx`): Envoltorio visual para preguntas e intentos.
   ```tsx
   import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
   ```
4. **Badge** (`badge.tsx`): Etiquetas para roles, estados e intentos.
   ```tsx
   import { Badge } from "@/components/ui/badge"
   <Badge variant="outline">PENDIENTE</Badge>
   ```
5. **Table** (`table.tsx`): Listado de cuestionarios e intentos de alumnos.
   ```tsx
   import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
   ```
6. **Dialog** (`dialog.tsx`): Ventanas modales e interactividad (ej. confirmar salida).
7. **Form** (`form.tsx`): Componente de formulario controlado para `react-hook-form` y validación de `zod`.
8. **Chart** (`chart.tsx`): Wrapper para visualizaciones y gráficas de reporte (basado en `recharts`).

---

## 5. Convenciones Visuales para Cuestionarios

Para garantizar una experiencia consistente en el llenado de exámenes, use las siguientes directrices y clases CSS:

### A. Bloque de Pregunta (Card)
Cada pregunta vive dentro de un `<Card>` con bordes suaves y fondo adaptativo.
```tsx
<Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-semibold flex items-center gap-2">
      <span className="text-primary font-bold">1.</span>
      ¿Cuál es la capital de Francia?
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
     {/* Opciones */}
  </CardContent>
</Card>
```

### B. Estados de Opción (Seleccionada vs No Seleccionada)
- **No Seleccionada**: Fondo transparente, borde gris claro, texto neutro.
- **Seleccionada**: Fondo azul/índigo translúcido (`bg-primary/10`), borde de color primario (`border-primary`), anillo de enfoque sutil.
```tsx
// Ejemplo de opción seleccionada
<div className="flex items-center p-3 rounded-lg border-2 border-primary bg-primary/10 cursor-pointer transition-all">
  <input type="radio" checked className="mr-3 accent-primary" />
  <span>París</span>
</div>
```

### C. Retroalimentación en Calificaciones (Correcto vs Incorrecto)
- **Correcto (Success)**: Borde verde (`border-emerald-500`), fondo verde translúcido (`bg-emerald-500/10`), texto verde (`text-emerald-400`).
- **Incorrecto (Destructive)**: Borde rojo (`border-destructive`), fondo rojo translúcido (`bg-destructive/10`), texto rojo.
- **Pendiente**: Borde ámbar (`border-warning`), fondo ámbar translúcido (`bg-warning/10`).

---

## 6. Patrones Comunes y Clases Útiles

- **Layout de página principal**:
  `className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"`
- **Contenedores adaptativos de dashboard**:
  `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"`
- **Títulos con degradados premium**:
  `className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent"`
