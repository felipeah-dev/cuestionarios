interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultadoCuestionarioPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Resultado de Intento</h1>
      <p className="text-muted-foreground">ID del cuestionario: {id}</p>
      {/* TODO: Mostrar calificación final, puntaje obtenido y revisión de preguntas */}
    </div>
  );
}
