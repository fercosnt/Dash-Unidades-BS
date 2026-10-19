import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminBearer } from "@/lib/fechamento/auth";
import { montarStatusFechamento } from "@/lib/fechamento/status";
import { buscarFechamentoVigente, fecharMesClinica, reabrirMesClinica } from "@/lib/fechamento/fechar";
import { mapearProcedimentos, type RegraProcedimento } from "@/lib/fechamento/mapear-procedimentos";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";
import { calcularEPersistirComissaoDentista } from "@/lib/comissao-dentista-calculo";
import { syncClinicaMonth } from "@/lib/clinicorp-sync";
import { firstDayOfMonth } from "@/lib/utils/date-helpers";

/**
 * API de fechamento consumida pelo plugin Claude `bs-fechamento` (PRD/PRD-fechamento-plugin.md).
 * Auth: Bearer com o access token Supabase do admin que está fechando.
 *
 *   GET  /api/fechamento/status?clinica_id&mes        checklist do mês
 *   GET  /api/fechamento/catalogo?clinica_id          procedimentos, regras, médicos, categorias, dentistas
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

const mes = z.string().regex(/^\d{4}-\d{2}$/, "mes deve ser YYYY-MM");
const clinicaMes = z.object({ clinica_id: z.string().uuid(), mes });

const schemas = {
  sync: clinicaMes,
  "mapear-procedimentos": clinicaMes.extend({
    linhas: z
      .array(
        z.object({
          data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          paciente: z.string().min(1),
          procedimento: z.string().min(1),
          valor: z.number().optional(),
          profissional: z.string().optional(),
        })
      )
      .min(1),
  }),
  procedimentos: clinicaMes.extend({
    linhas: z.array(
      z.object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        paciente: z.string().min(1),
        procedimento_id: z.string().uuid(),
        texto_original: z.string(),
        profissional: z.string().optional(),
        valor: z.number().optional(),
      })
    ),
  }),
  regras: z.object({
    padrao: z.string().min(2),
    procedimento_id: z.string().uuid().nullable(),
    ignorar: z.boolean().default(false),
    prioridade: z.number().int().default(100),
    clinica_id: z.string().uuid().nullable().default(null),
    observacao: z.string().optional(),
  }),
  indicacao: z.object({
    orcamento_id: z.string().uuid(),
    medico_indicador_id: z.string().uuid().nullable(),
  }),
  despesas: clinicaMes.extend({
    categoria: z.string().min(1), // nome da categoria (ex.: "Salário Dentista")
    descricao: z.string().optional(),
    valor: z.number().positive(),
    recorrente: z.boolean().default(false),
  }),
  "comissao-dentista": clinicaMes,
  recalcular: clinicaMes,
  fechar: clinicaMes.extend({
    decisoes: z.array(z.object({ passo: z.string().optional(), texto: z.string() })).default([]),
    divergencias: z
      .array(z.object({ passo: z.string().optional(), fonte: z.string().optional(), descricao: z.string(), valor: z.number().optional() }))
      .default([]),
  }),
  reabrir: clinicaMes.extend({ motivo: z.string().min(3) }),
} as const;

type AcaoPost = keyof typeof schemas;
// Ações que escrevem dados do mês exigem o mês aberto
const EXIGE_MES_ABERTO: AcaoPost[] = ["sync", "procedimentos", "despesas", "comissao-dentista", "recalcular", "fechar"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function GET(request: Request, { params }: { params: Promise<{ acao: string }> }) {
  const auth = await requireAdminBearer(request);
  if (!auth.ok) return auth.response;
  const { acao } = await params;
  const url = new URL(request.url);
  const clinicaId = url.searchParams.get("clinica_id") ?? "";

  try {
    if (acao === "status") {
      const parsed = clinicaMes.safeParse({ clinica_id: clinicaId, mes: url.searchParams.get("mes") ?? "" });
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message }, 400);
      return json(await montarStatusFechamento(auth.admin, parsed.data.clinica_id, parsed.data.mes));
    }

    if (acao === "catalogo") {
      const [clinicas, procedimentos, regras, medicos, categorias, dentistas] = await Promise.all([
        auth.admin.from("clinicas_parceiras").select("id, nome, clinicorp_subscriber_id").eq("ativo", true),
        auth.admin.from("procedimentos").select("id, nome, custo_fixo, categoria").eq("ativo", true).order("nome"),
        auth.admin.from("regras_procedimento").select("*").eq("ativo", true).order("prioridade"),
        auth.admin.from("medicos_indicadores").select("id, nome, clinica_id, percentual_comissao").eq("ativo", true),
        auth.admin.from("categorias_despesa").select("id, nome").eq("ativo", true).order("nome"),
        auth.admin.from("dentistas").select("id, nome, clinica_id").eq("ativo", true),
      ]);
      const doClinica = <T extends { clinica_id: string | null }>(rows: T[] | null) =>
        (rows ?? []).filter((r) => !clinicaId || r.clinica_id === null || r.clinica_id === clinicaId);
      return json({
        clinicas: clinicas.data ?? [],
        procedimentos: procedimentos.data ?? [],
        regras: doClinica(regras.data),
        medicos: doClinica(medicos.data),
        categorias_despesa: categorias.data ?? [],
        dentistas: doClinica(dentistas.data),
      });
    }

    return json({ error: `Ação GET desconhecida: ${acao}` }, 404);
  } catch (err) {
    console.error(`[api/fechamento/${acao}]`, err instanceof Error ? err.message : err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ acao: string }> }) {
  const auth = await requireAdminBearer(request);
  if (!auth.ok) return auth.response;
  const { admin, userId } = auth;
  const { acao } = await params;

  if (!(acao in schemas)) return json({ error: `Ação POST desconhecida: ${acao}` }, 404);
  const parsed = schemas[acao as AcaoPost].safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, 400);
  const body = parsed.data as Record<string, unknown>;

  try {
    if (EXIGE_MES_ABERTO.includes(acao as AcaoPost)) {
      if (await buscarFechamentoVigente(admin, body.clinica_id as string, body.mes as string)) {
        return json({ error: `Mês ${body.mes} está fechado para esta clínica. Reabra antes de alterar.` }, 409);
      }
    }

    switch (acao as AcaoPost) {
      case "sync": {
        const b = body as z.infer<typeof schemas.sync>;
        const r = await syncClinicaMonth(b.clinica_id, firstDayOfMonth(b.mes), { trigger: "manual", userId });
        return json(r);
      }

      case "mapear-procedimentos": {
        const b = body as z.infer<(typeof schemas)["mapear-procedimentos"]>;
        const [regras, catalogo] = await Promise.all([
          admin.from("regras_procedimento").select("id, padrao, procedimento_id, ignorar, prioridade, clinica_id").eq("ativo", true),
          admin.from("procedimentos").select("id, nome, custo_fixo").eq("ativo", true),
        ]);
        const resultado = mapearProcedimentos(
          b.linhas,
          (regras.data ?? []) as RegraProcedimento[],
          (catalogo.data ?? []).map((p) => ({ ...p, custo_fixo: Number(p.custo_fixo) })),
          b.clinica_id
        );
        return json(resultado);
      }

      case "procedimentos": {
        const b = body as z.infer<typeof schemas.procedimentos>;
        const linhas = b.linhas.map((l) => ({
          paciente_nome: l.paciente,
          procedimento_id: l.procedimento_id,
          procedimento_nome: l.texto_original,
          data_execucao: l.data,
          profissional: l.profissional ?? null,
          valor: l.valor ?? 0,
        }));
        const { data, error } = await admin.rpc("substituir_tratamentos_mes", {
          p_clinica_id: b.clinica_id,
          p_mes: firstDayOfMonth(b.mes),
          p_linhas: linhas,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ inseridas: data });
      }

      case "regras": {
        const b = body as z.infer<typeof schemas.regras>;
        if (!b.ignorar && !b.procedimento_id) return json({ error: "Informe procedimento_id ou ignorar=true" }, 400);
        const { data, error } = await admin
          .from("regras_procedimento")
          .insert({ ...b, criado_por: userId })
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      case "indicacao": {
        const b = body as z.infer<typeof schemas.indicacao>;
        const { data: orc } = await admin
          .from("orcamentos_fechados")
          .select("clinica_id, mes_referencia")
          .eq("id", b.orcamento_id)
          .single();
        if (!orc) return json({ error: "Orçamento não encontrado" }, 404);
        if (await buscarFechamentoVigente(admin, orc.clinica_id, String(orc.mes_referencia))) {
          return json({ error: "Mês do orçamento está fechado. Reabra antes de alterar." }, 409);
        }
        const { error } = await admin
          .from("orcamentos_fechados")
          .update({ medico_indicador_id: b.medico_indicador_id, tem_indicacao: b.medico_indicador_id !== null })
          .eq("id", b.orcamento_id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      case "despesas": {
        const b = body as z.infer<typeof schemas.despesas>;
        const { data: cat } = await admin
          .from("categorias_despesa")
          .select("id")
          .ilike("nome", b.categoria)
          .eq("ativo", true)
          .maybeSingle();
        if (!cat) return json({ error: `Categoria não encontrada: ${b.categoria}` }, 400);
        const { data, error } = await admin
          .from("despesas_operacionais")
          .insert({
            clinica_id: b.clinica_id,
            mes_referencia: firstDayOfMonth(b.mes),
            categoria_id: cat.id,
            descricao: b.descricao ?? null,
            valor: b.valor,
            recorrente: b.recorrente,
          })
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      case "comissao-dentista": {
        const b = body as z.infer<(typeof schemas)["comissao-dentista"]>;
        const { data: dentistas } = await admin
          .from("dentistas")
          .select("id, nome")
          .eq("clinica_id", b.clinica_id)
          .eq("ativo", true);
        if (!dentistas?.length) return json({ error: "Nenhuma dentista ativa na clínica" }, 400);
        const resultados = [];
        for (const d of dentistas) {
          resultados.push({ dentista: d.nome, ...(await calcularEPersistirComissaoDentista(admin, d.id, b.clinica_id, b.mes)) });
        }
        return json({ resultados });
      }

      case "recalcular": {
        const b = body as z.infer<typeof schemas.recalcular>;
        const r = await calcularEPersistirResumo(b.clinica_id, b.mes);
        return r.ok ? json({ ok: true }) : json({ error: r.error }, 400);
      }

      case "fechar": {
        const b = body as z.infer<typeof schemas.fechar>;
        const r = await fecharMesClinica(admin, {
          clinicaId: b.clinica_id,
          mes: b.mes,
          userId,
          decisoes: b.decisoes,
          divergencias: b.divergencias,
        });
        return r.ok ? json(r) : json({ error: r.error }, 400);
      }

      case "reabrir": {
        const b = body as z.infer<typeof schemas.reabrir>;
        const r = await reabrirMesClinica(admin, { clinicaId: b.clinica_id, mes: b.mes, userId, motivo: b.motivo });
        return r.ok ? json(r) : json({ error: r.error }, 400);
      }
    }
  } catch (err) {
    console.error(`[api/fechamento/${acao}]`, err instanceof Error ? err.message : err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
}
