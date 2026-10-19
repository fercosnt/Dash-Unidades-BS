import { NextResponse } from "next/server";
import { requireAdminBearer } from "@/lib/fechamento/auth";
import {
  acoesPost,
  catalogoFechamento,
  ErroFechamento,
  relatorioMensal,
  schemaClinicaMes,
  schemaRelatorio,
  schemasAcao,
  statusFechamento,
  type AcaoPost,
  type ContextoFechamento,
} from "@/lib/fechamento/acoes";

/**
 * API de fechamento consumida pelo plugin Claude `bs-fechamento` (PRD/PRD-fechamento-plugin.md).
 * Auth: Bearer com o access token Supabase do admin que está fechando.
 * A lógica de cada ação mora em `lib/fechamento/acoes.ts` (compartilhada com o MCP em /api/mcp).
 *
 *   GET  /api/fechamento/status?clinica_id&mes        checklist do mês
 *   GET  /api/fechamento/catalogo?clinica_id          procedimentos, regras, médicos, categorias, dentistas
 *   GET  /api/fechamento/relatorio?clinica_id&mes&tipo relatório mensal (tipo = interno | parceiro)
 *   POST /api/fechamento/sync                          re-sync Clinicorp do mês
 *   POST /api/fechamento/mapear-procedimentos          planilha → catálogo (não grava)
 *   POST /api/fechamento/procedimentos                 substitui os procedimentos do mês
 *   POST /api/fechamento/regras                        nova regra de procedimento
 *   POST /api/fechamento/indicacao                     médico indicador do orçamento
 *   POST /api/fechamento/despesas                      lança despesa operacional
 *   POST /api/fechamento/comissao-dentista             recalcula comissão(ões) da dentista
 *   POST /api/fechamento/recalcular                    recalcula resumo_mensal
 *   POST /api/fechamento/fechar | reabrir              fecha/reabre o mês da clínica
 */

export const maxDuration = 120;

// Ações que criam registro respondem 201
const CRIA_REGISTRO: AcaoPost[] = ["regras", "despesas"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

function respostaErro(acao: string, err: unknown) {
  if (err instanceof ErroFechamento) return json({ error: err.message }, err.status);
  console.error(`[api/fechamento/${acao}]`, err instanceof Error ? err.message : err);
  return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
}

export async function GET(request: Request, { params }: { params: Promise<{ acao: string }> }) {
  const auth = await requireAdminBearer(request);
  if (!auth.ok) return auth.response;
  const ctx: ContextoFechamento = { admin: auth.admin, userId: auth.userId, usuario: auth.usuario };
  const { acao } = await params;
  const url = new URL(request.url);
  const clinicaId = url.searchParams.get("clinica_id") ?? "";

  try {
    if (acao === "status") {
      const parsed = schemaClinicaMes.safeParse({ clinica_id: clinicaId, mes: url.searchParams.get("mes") ?? "" });
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message }, 400);
      return json(await statusFechamento(ctx, parsed.data));
    }

    if (acao === "catalogo") {
      return json(await catalogoFechamento(ctx, clinicaId));
    }

    if (acao === "relatorio") {
      const parsed = schemaRelatorio.safeParse({
        clinica_id: clinicaId,
        mes: url.searchParams.get("mes") ?? "",
        tipo: url.searchParams.get("tipo") ?? "",
      });
      if (!parsed.success) return json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, 400);
      return json(await relatorioMensal(ctx, parsed.data));
    }

    return json({ error: `Ação GET desconhecida: ${acao}` }, 404);
  } catch (err) {
    return respostaErro(acao, err);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ acao: string }> }) {
  const auth = await requireAdminBearer(request);
  if (!auth.ok) return auth.response;
  const ctx: ContextoFechamento = { admin: auth.admin, userId: auth.userId, usuario: auth.usuario };
  const { acao } = await params;

  if (!(acao in schemasAcao)) return json({ error: `Ação POST desconhecida: ${acao}` }, 404);
  const nome = acao as AcaoPost;
  const parsed = schemasAcao[nome].safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, 400);

  try {
    const executar = acoesPost[nome] as (c: ContextoFechamento, input: unknown) => Promise<unknown>;
    const resultado = await executar(ctx, parsed.data);
    return json(resultado, CRIA_REGISTRO.includes(nome) ? 201 : 200);
  } catch (err) {
    return respostaErro(acao, err);
  }
}
