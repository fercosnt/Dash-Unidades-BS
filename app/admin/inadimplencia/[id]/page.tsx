import { getOrcamentoDetalhe } from "./actions";
import { DetalheOrcamentoClient } from "./DetalheOrcamentoClient";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function DetalheOrcamentoPage({ params }: Props) {
  const { id } = await params;
  const orcamento = await getOrcamentoDetalhe(id);
  if (!orcamento) notFound();

  return <DetalheOrcamentoClient orcamento={orcamento} />;
}
