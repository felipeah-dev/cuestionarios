interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResponderCuestionarioPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Responder Cuestionario</h1>
      <p className="text-muted-foreground">ID del cuestionario: {id}</p>
      {/* TODO: Implementar formulario interactivo para responder cuestionario */}
    </div>
  );
}
