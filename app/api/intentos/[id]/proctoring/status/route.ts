import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const intento = await prisma.intento.findFirst({
    where: { id, usuarioId: user.id },
    select: {
      id: true,
      cuestionarioId: true,
      estado: true,
      alertasProctoring: {
        where: { estadoRevision: "PENDIENTE" },
        orderBy: { creadoEn: "desc" },
        take: 1,
        select: {
          id: true,
          nivelAlerta: true,
          confianza: true,
          creadoEn: true,
        },
      },
    },
  });

  if (!intento) {
    return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: intento.id,
    cuestionarioId: intento.cuestionarioId,
    estado: intento.estado,
    paused: intento.estado === "PAUSADO_REVISION_IA",
    canceled: intento.estado === "CANCELADO_CONFIRMADO",
    latestPendingAlert: intento.alertasProctoring[0] ?? null,
  });
}
