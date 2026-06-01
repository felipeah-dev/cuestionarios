# Prompt — Nelson

## Proyecto

App de cuestionarios académicos. Stack: **Next.js 16 (App Router), Prisma 5, Auth.js v5, shadcn/ui, Tailwind CSS v4, PostgreSQL**. Gestor de paquetes: **pnpm**.

Repo: `https://github.com/felipeah-dev/cuestionarios.git`

## Levantar por primera vez

1. Tener Docker Desktop corriendo
2. `docker compose up -d` → PostgreSQL en puerto 5433
3. `pnpm install`
4. `pnpm prisma migrate dev`
5. `pnpm prisma db seed` → usuarios de prueba listos
6. `pnpm dev` → http://localhost:3000

Login con `usuario@test.com` / `usuario123`

## Tu módulo

`app/usuario/cuestionarios/` — el usuario ve los cuestionarios disponibles y los responde.

Archivos vacíos que debes implementar:
- `page.tsx` — lista todos los cuestionarios existentes en la BD
- `[id]/page.tsx` — formulario interactivo para responder; el `[id]` es el `cuestionarioId`
- `_actions.ts` — ya existe el stub `submitQuizAction`, impleméntalo junto con las demás actions que necesites
- `_components/` y `[id]/_components/` — tus componentes locales

Obtén el usuario en sesión así:
```ts
import { getCurrentUser } from "@/lib/auth";
const user = await getCurrentUser();
```

**Contrato con el equipo:**
- Al iniciar un cuestionario, crea un `Intento` con `{ cuestionarioId, usuarioId: user.id, estado: 'EN_PROGRESO' }`.
- Guarda cada respuesta como `Respuesta` con `{ intentoId, preguntaId, opcionId }` (opción múltiple) o `{ intentoId, preguntaId, respuestaAbierta }` (abierta).
- Al enviar: cambia `Intento.estado` a `'ENVIADO'` y guarda `enviadoEn`. Luego, para cada `Respuesta` de pregunta `OPCION_MULTIPLE`, compara si `Opcion.esCorrecta === true` y asigna `puntajeObtenido = Pregunta.puntos` si es correcta, o `0` si no. Las respuestas `ABIERTA` quedan con `puntajeObtenido: null`.
- Tras enviar, redirige a `/usuario/cuestionarios/[cuestionarioId]/resultado`.

Lee `prisma/schema.prisma` para todos los campos.

Diseño: sigue `frontend.md` en la raíz. El patrón visual de opciones seleccionadas/no seleccionadas está documentado ahí. Variables semánticas, componentes en `components/ui/`.

## Cómo probar sin esperar a nadie

Usa `pnpm prisma studio` (corre en http://localhost:5555) para insertar manualmente un `Cuestionario` con `Pregunta`s y `Opcion`es. Con eso puedes desarrollar toda la vista de respuesta sin esperar a Brandon.

## Checklist de entrega

Verifica que todo esto funciona antes de avisarle a Felipe para que haga el merge a main:

- [x] Los usuarios con rol USUARIO no pueden crear cuestionarios — solo responderlos
- [x] Al enviar el cuestionario, las preguntas de opción múltiple se califican automáticamente comparando contra `Opcion.esCorrecta`
- [x] Las respuestas de preguntas abiertas quedan con `puntajeObtenido: null` al enviar
- [x] El intento cambia a estado `ENVIADO` al terminar y redirige a la página de resultado
