import { redirect } from "next/navigation";
import { fetchSplitReview, type OrcamentoReviewRow } from "../split-actions";
import { listarProcedimentos, type ProcedimentoRow } from "../../procedimentos/actions";
import { listarCategoriasProcedimentos } from "../../procedimentos/actions";
import { RevisaoSplitClient } from "./RevisaoSplitClient";

type Props = {
  searchParams: Promise<{ mes?: string }>;
};

export default async function RevisaoSplitPage({ searchParams }: Props) {
  const { mes } = await searchParams;
  if (!mes) redirect("/admin/configuracoes/fechamento");

  const [orcamentos, procedimentos, categorias] = await Promise.all([
    fetchSplitReview(mes),
    listarProcedimentos({ status: "ativo" }),
    listarCategoriasProcedimentos(),
  ]);

  return (
    <RevisaoSplitClient
      mesReferencia={mes}
      initialOrcamentos={orcamentos}
      procedimentos={procedimentos}
      categorias={categorias}
    />
  );
}
