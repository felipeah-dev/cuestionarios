import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { processProctoringSnapshot } from "@/lib/proctoring/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "USUARIO") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const snapshot = formData.get("snapshot");

    if (!(snapshot instanceof File)) {
      return NextResponse.json(
        { error: "Snapshot requerido" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await snapshot.arrayBuffer());
    const result = await processProctoringSnapshot({
      intentoId: id,
      usuarioId: user.id,
      bytes,
      mimeType: snapshot.type || "application/octet-stream",
    });

    revalidatePath("/admin/proctoring");
    revalidatePath("/usuario/cuestionarios");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al procesar snapshot de proctoring:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el snapshot",
      },
      { status: 500 }
    );
  }
}

