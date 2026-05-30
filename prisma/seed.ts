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
  const userPasswordHash = await bcrypt.hash("user123", 10);

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

  console.log("Seeding completado con éxito:");
  console.log(`- Administrador: ${admin.email} (Rol: ${admin.rol})`);
  console.log(`- Usuario regular: ${usuario.email} (Rol: ${usuario.rol})`);
}

main()
  .catch((e) => {
    console.error("Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
