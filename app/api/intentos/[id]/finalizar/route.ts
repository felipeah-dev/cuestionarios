import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { finalizeQuizAttemptForUser } from "@/lib/quiz-finalization";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.rol !== "USUARIO") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await finalizeQuizAttemptForUser({
      intentoId: id,
      usuarioId: user.id,
    });

    revalidatePath("/usuario/cuestionarios");
    revalidatePath(`/usuario/cuestionarios/${result.cuestionarioId}/resultado`);

    return NextResponse.json({
      ok: true,
      redirectTo: `/usuario/cuestionarios/${result.cuestionarioId}/resultado`,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
