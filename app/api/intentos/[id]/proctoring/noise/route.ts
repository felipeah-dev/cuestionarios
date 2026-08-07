import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { processProctoringNoise } from "@/lib/proctoring/noise-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.rol !== "USUARIO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Audio requerido" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await audio.arrayBuffer());
    const result = await processProctoringNoise({
      intentoId: id,
      usuarioId: user.id,
      bytes,
      mimeType: audio.type || "audio/webm",
    });

    revalidatePath("/admin/proctoring");
    revalidatePath("/usuario/cuestionarios");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el audio",
      },
      { status: 400 }
    );
  }
}
