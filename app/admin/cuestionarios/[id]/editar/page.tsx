interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCuestionarioPage({ params }: Props) {
  const { id } = await params;
  return <div>TODO: Editar Cuestionario {id}</div>;
}
