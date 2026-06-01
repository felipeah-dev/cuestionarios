import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando la siembra (seeding) de la base de datos...");

  // Clean existing test users if they exist to avoid unique constraint violations
  await prisma.usuario.deleteMany({
    where: {
      email: {
        in: ["admin@test.com", "usuario@test.com"],
      },
    },
  });

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("usuario123", 10);

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Administrador de Prueba",
      email: "admin@test.com",
      password: adminPasswordHash,
      rol: Rol.ADMIN,
    },
  });

  const usuario = await prisma.usuario.create({
    data: {
      nombre: "Usuario de Prueba",
      email: "usuario@test.com",
      password: userPasswordHash,
      rol: Rol.USUARIO,
    },
  });

  // Clean existing records to avoid unique constraint or duplicate key violations
  await prisma.respuesta.deleteMany({});
  await prisma.intento.deleteMany({});
  await prisma.opcion.deleteMany({});
  await prisma.pregunta.deleteMany({});
  await prisma.cuestionario.deleteMany({});

  // 1. Cuestionario 1: Trivia de JavaScript (Solo opción múltiple)
  const cuestionario1 = await prisma.cuestionario.create({
    data: {
      titulo: "Fundamentos de JavaScript",
      descripcion: "Evalúa tus conocimientos sobre variables, tipos de datos y funciones en JS.",
      adminId: admin.id,
      preguntas: {
        create: [
          {
            texto: "¿Cuál de los siguientes no es un tipo de datos primitivo en JavaScript?",
            tipo: "OPCION_MULTIPLE",
            puntos: 10,
            orden: 1,
            opciones: {
              create: [
                { texto: "String", esCorrecta: false },
                { texto: "Boolean", esCorrecta: false },
                { texto: "Object", esCorrecta: true },
                { texto: "Number", esCorrecta: false },
              ],
            },
          },
          {
            texto: "¿Qué palabra clave se usa para declarar una variable de ámbito de bloque en ES6?",
            tipo: "OPCION_MULTIPLE",
            puntos: 10,
            orden: 2,
            opciones: {
              create: [
                { texto: "var", esCorrecta: false },
                { texto: "let", esCorrecta: true },
                { texto: "define", esCorrecta: false },
                { texto: "global", esCorrecta: false },
              ],
            },
          },
        ],
      },
    },
  });

  // 2. Cuestionario 2: Historia Universal y Filosofía (Mixto: Múltiple + Abierta)
  const cuestionario2 = await prisma.cuestionario.create({
    data: {
      titulo: "Historia Universal y Filosofía",
      descripcion: "Cuestionario mixto con preguntas de opción múltiple y de desarrollo abierto.",
      adminId: admin.id,
      preguntas: {
        create: [
          {
            texto: "¿En qué año comenzó la Primera Guerra Mundial?",
            tipo: "OPCION_MULTIPLE",
            puntos: 15,
            orden: 1,
            opciones: {
              create: [
                { texto: "1912", esCorrecta: false },
                { texto: "1914", esCorrecta: true },
                { texto: "1918", esCorrecta: false },
                { texto: "1939", esCorrecta: false },
              ],
            },
          },
          {
            texto: "Explica brevemente la diferencia entre el racionalismo y el empirismo según lo estudiado en clase.",
            tipo: "ABIERTA",
            puntos: 25,
            orden: 2,
          },
        ],
      },
    },
  });

  console.log("Seeding completado con éxito:");
  console.log(`- Administrador: ${admin.email} (Rol: ${admin.rol})`);
  console.log(`- Usuario regular: ${usuario.email} (Rol: ${usuario.rol})`);
  console.log(`- Cuestionario 1: ${cuestionario1.titulo} (ID: ${cuestionario1.id})`);
  console.log(`- Cuestionario 2: ${cuestionario2.titulo} (ID: ${cuestionario2.id})`);
}

main()
  .catch((e) => {
    console.error("Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
