interface Props {
  params: Promise<{ id: string }>;
}

export default async function CalificarCuestionarioPage({ params }: Props) {
  const { id } = await params;
  return <div>TODO: Calificar Cuestionario {id}</div>;
}
