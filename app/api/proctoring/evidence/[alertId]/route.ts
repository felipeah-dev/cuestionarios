import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSnapshotMimeTypeFromPath,
  readProctoringSnapshot,
} from "@/lib/proctoring/storage";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ alertId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { alertId } = await params;
  const alert = await prisma.alertaProctoring.findFirst({
    where: {
      id: alertId,
      intento: {
        cuestionario: {
          adminId: user.id,
        },
      },
    },
    select: { snapshotPath: true },
  });

  if (!alert) {
    return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
  }

  try {
    const bytes = await readProctoringSnapshot(alert.snapshotPath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": getSnapshotMimeTypeFromPath(alert.snapshotPath),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer la evidencia" },
      { status: 404 }
    );
  }
}
