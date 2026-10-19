/**
 * Tools do conector MCP remoto do fechamento (`/api/mcp`), consumidas pelo plugin
 * `bs-fechamento` 0.2.0. Mesmos nomes e semântica da 0.1.0 (servidor local), com uma
 * diferença: o servidor não lê arquivo — o Claude lê a planilha e envia as `linhas`.
 *
 * Toda tool que grava recebe `confirmar`: false (padrão) devolve a prévia, true grava.
 * As regras de negócio ficam em `lib/fechamento/acoes.ts` (injetadas via `deps`, o que
 * permite testar o mapeamento input → ação sem banco).
 */
import { z } from "zod";
import type * as Acoes from "@/lib/fechamento/acoes";
import type { ContextoFechamento, Catalogo } from "@/lib/fechamento/acoes";
import type { ResultadoMapeamento } from "@/lib/fechamento/mapear-procedimentos";
import type { StatusFechamento } from "@/lib/fechamento/status";
import { schemaLinhaPlanilha } from "@/lib/fechamento/schemas";
import { formatCurrency } from "@/lib/utils/formatting";
import { montarProcedimentosFinais, prepararLinhasDoMes, resolverClinica, resolverPorNome } from "@/lib/fechamento/mcp/resolver";

export type DepsFerramentas = Pick<
  typeof Acoes,
  | "catalogoFechamento"
  | "statusFechamento"
  | "mapearProcedimentosMes"
  | "gravarProcedimentosMes"
  | "criarRegraProcedimento"
  | "sincronizarMes"
  | "definirIndicacao"
  | "lancarDespesa"
  | "recalcularComissaoDentista"
  | "recalcularResumo"
  | "fecharMes"
  | "reabrirMes"
  | "relatorioMensal"
>;

export type Ambiente = { ctx: ContextoFechamento; email: string | null; deps: DepsFerramentas };

export type Ferramenta = {
  nome: string;
  descricao: string;
  shape: z.ZodRawShape;
  somenteLeitura: boolean;
  executar: (args: Record<string, unknown>, amb: Ambiente) => Promise<unknown>;
};

function ferramenta<S extends z.ZodRawShape>(def: {
  nome: string;
  descricao: string;
  shape: S;
  somenteLeitura?: boolean;
  executar: (args: z.infer<z.ZodObject<S>>, amb: Ambiente, cat: CatalogoSob) => Promise<unknown>;
}): Ferramenta {
  return {
    nome: def.nome,
    descricao: def.descricao,
    shape: def.shape,
    somenteLeitura: def.somenteLeitura ?? false,
    executar: (args, amb) => def.executar(args as z.infer<z.ZodObject<S>>, amb, catalogoSobDemanda(amb)),
  };
}

/** Catálogo carregado no máximo uma vez por chamada de tool. */
type CatalogoSob = () => Promise<Catalogo>;
function catalogoSobDemanda(amb: Ambiente): CatalogoSob {
  let p: Promise<Catalogo> | null = null;
  return () => (p ??= amb.deps.catalogoFechamento(amb.ctx));
}

const brl = (n: number) => formatCurrency(Number(n) || 0);

const pClinica = z.string().describe("Nome da clínica (ex.: 'Hirata'), subscriber_id do Clinicorp ou id");
const pMes = z.string().regex(/^\d{4}-\d{2}$/).describe("Mês no formato YYYY-MM");
const pConfirmar = z
  .boolean()
  .default(false)
  .describe("false = só mostra a prévia (padrão); true = grava. Só use true depois do OK explícito da pessoa.");
const pLinhas = z
  .array(schemaLinhaPlanilha.extend({ data: z.string().describe("Data de execução YYYY-MM-DD (coluna 'Executado')") }))
  .min(1)
  .describe(
    "Linhas da planilha 'Procedimentos Executados' do Clinicorp, lidas pelo Claude: data (YYYY-MM-DD), paciente, procedimento (texto da coluna Procedimento), valor e profissional opcionais. Todas do mês."
  );

// ---------- conexão e leitura ----------

const bsConexao = ferramenta({
  nome: "bs_conexao",
  descricao: "Mostra com qual usuário o conector está logado no Dash Unidades BS e lista as clínicas ativas (teste de conexão).",
  shape: {},
  somenteLeitura: true,
  executar: async (_a, amb, catalogo) => {
    const cat = await catalogo();
    return { conectado: true, usuario: amb.email, sistema: "Dash Unidades BS", clinicas: cat.clinicas.map((c) => c.nome) };
  },
});

const bsCatalogo = ferramenta({
  nome: "bs_catalogo",
  descricao:
    "Catálogo do sistema: clínicas, procedimentos (com custo), regras de mapeamento da planilha, médicos indicadores, categorias de despesa e dentistas.",
  shape: { clinica: pClinica.optional() },
  somenteLeitura: true,
  executar: async ({ clinica }, amb, catalogo) => {
    if (!clinica) return catalogo();
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    return amb.deps.catalogoFechamento(amb.ctx, c.id);
  },
});

const bsStatus = ferramenta({
  nome: "bs_status",
  descricao:
    "Checklist do fechamento de uma clínica/mês direto do sistema: sync, orçamentos, pagamentos (com alerta da regra dos 30%), procedimentos, indicações, despesas, comissão da dentista, resumo e se o mês já está fechado. Use no início e no fim de cada passo.",
  shape: { clinica: pClinica, mes: pMes },
  somenteLeitura: true,
  executar: async ({ clinica, mes }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    return { clinica: c.nome, ...(await amb.deps.statusFechamento(amb.ctx, { clinica_id: c.id, mes })) };
  },
});

const USO_RELATORIO = {
  parceiro:
    "Relatório do PARCEIRO: só dados que a clínica pode ver (o servidor já removeu tudo que é interno). Pode ser enviado à clínica.",
  interno:
    "Relatório INTERNO Beauty Smile — CONFIDENCIAL. Nunca enviar à clínica nem usar como base do relatório do parceiro (para isso, chame tipo='parceiro').",
} as const;

const bsRelatorio = ferramenta({
  nome: "bs_relatorio",
  descricao:
    "Dados do relatório mensal de uma clínica. tipo='parceiro': SÓ o que a clínica pode ver — vendas, cálculo do split (custos, líquido, 60/40), recebido, inadimplência, conta corrente e comparativo com o mês anterior; é a ÚNICA base permitida para o relatório enviado à clínica. tipo='interno': tudo isso + DREs Beauty Smile (faturamento e caixa), despesas, margem do dentista, decisões/divergências do fechamento, pendências e alertas — confidencial.",
  shape: {
    clinica: pClinica,
    mes: pMes,
    tipo: z.enum(["interno", "parceiro"]).describe("'parceiro' = para enviar à clínica; 'interno' = gestão Beauty Smile (confidencial)"),
  },
  somenteLeitura: true,
  executar: async ({ clinica, mes, tipo }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    const relatorio = await amb.deps.relatorioMensal(amb.ctx, { clinica_id: c.id, mes, tipo });
    return { uso: USO_RELATORIO[tipo], ...relatorio };
  },
});

// ---------- procedimentos ----------

function resumirMapeamento(r: ResultadoMapeamento) {
  const porProcedimento = r.mapeadas.reduce<Record<string, { qtde: number; custo: number }>>((acc, m) => {
    const k = m.procedimento_nome;
    acc[k] = { qtde: (acc[k]?.qtde ?? 0) + 1, custo: (acc[k]?.custo ?? 0) + m.custo };
    return acc;
  }, {});
  return {
    mapeadas: r.mapeadas.length,
    custo_mapeado: brl(r.custoTotal),
    ambiguas: r.ambiguas,
    possiveis_duplicatas: r.possiveisDuplicatas,
    ignoradas: r.ignoradas.map((i) => `${i.data} ${i.paciente}: ${i.parte}`),
    custo_por_procedimento: Object.entries(porProcedimento).map(([nome, v]) => `${v.qtde}x ${nome} = ${brl(v.custo)}`),
  };
}

const bsMapearProcedimentos = ferramenta({
  nome: "bs_mapear_procedimentos",
  descricao:
    "Mapeia as linhas da planilha 'Procedimentos Executados' do mês para o catálogo usando as regras do sistema. NÃO grava. Devolve mapeadas (com custo), ignoradas (regra 'sem custo'), ambíguas (sem regra — perguntar à pessoa) e possíveis duplicatas.",
  shape: { clinica: pClinica, mes: pMes, linhas: pLinhas },
  somenteLeitura: true,
  executar: async ({ clinica, mes, linhas }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    const doMes = prepararLinhasDoMes(linhas, mes);
    const r = await amb.deps.mapearProcedimentosMes(amb.ctx, { clinica_id: c.id, mes, linhas: doMes });
    return { clinica: c.nome, linhas_planilha: doMes.length, ...resumirMapeamento(r) };
  },
});

const bsGravarProcedimentos = ferramenta({
  nome: "bs_gravar_procedimentos",
  descricao:
    "Grava os procedimentos do mês no sistema a partir das linhas da planilha, SUBSTITUINDO os já importados no mês (reimportar não duplica). Toda linha ambígua precisa de resolução; duplicatas confirmadas vão em `remover`. Com confirmar=false mostra a prévia.",
  shape: {
    clinica: pClinica,
    mes: pMes,
    linhas: pLinhas,
    resolucoes: z
      .array(
        z.object({
          data: z.string(),
          paciente: z.string(),
          parte: z.string().describe("Trecho exato da ambígua (campo 'parte')"),
          procedimento: z.string().nullable().describe("Nome ou id do procedimento; null = ignorar (sem custo)"),
        })
      )
      .default([])
      .describe("Decisão da pessoa para cada linha ambígua"),
    remover: z
      .array(z.object({ data: z.string(), paciente: z.string(), parte: z.string() }))
      .default([])
      .describe("Linhas mapeadas que são duplicata e não devem entrar"),
    confirmar: pConfirmar,
  },
  executar: async ({ clinica, mes, linhas, resolucoes, remover, confirmar }, amb, catalogo) => {
    const cat = await catalogo();
    const c = resolverClinica(cat.clinicas, clinica);
    const doMes = prepararLinhasDoMes(linhas, mes);
    const r = await amb.deps.mapearProcedimentosMes(amb.ctx, { clinica_id: c.id, mes, linhas: doMes });
    const finais = montarProcedimentosFinais(r, doMes, resolucoes, remover, cat.procedimentos);

    const previa = {
      clinica: c.nome,
      mes,
      linhas_a_gravar: finais.length,
      custo_total: brl(finais.reduce((s, f) => s + f.custo, 0)),
      removidas_como_duplicata: remover.length,
      ignoradas: r.ignoradas.length + resolucoes.filter((x) => x.procedimento === null).length,
      aviso: "Substitui TODOS os procedimentos já importados deste mês para esta clínica.",
    };
    if (!confirmar) return { previa, gravado: false };

    const res = await amb.deps.gravarProcedimentosMes(amb.ctx, {
      clinica_id: c.id,
      mes,
      linhas: finais.map(({ nome: _n, custo: _c, ...l }) => l),
    });
    return { ...previa, gravado: true, inseridas: res.inseridas };
  },
});

const bsCriarRegra = ferramenta({
  nome: "bs_criar_regra",
  descricao:
    "Cria regra de mapeamento da planilha (memória compartilhada entre quem fecha): quando o texto contiver `padrao`, usa o procedimento — ou ignora (sem custo). Use quando a pessoa decidir algo que vai se repetir nos próximos meses.",
  shape: {
    padrao: z.string().min(2).describe("Trecho do texto da planilha (acento/caixa não importam); seja específico"),
    procedimento: z.string().nullable().describe("Nome ou id do procedimento; null = ignorar (sem custo)"),
    prioridade: z
      .number()
      .int()
      .default(25)
      .describe("Menor vence. Seed: 10-20 exceções/ignorar, 30-70 gerais. Use < da regra que estiver casando errado."),
    clinica: pClinica.optional().describe("Só para esta clínica (omitir = todas)"),
    observacao: z.string().optional(),
    confirmar: pConfirmar,
  },
  executar: async ({ padrao, procedimento, prioridade, clinica, observacao, confirmar }, amb, catalogo) => {
    const cat = await catalogo();
    const proc = procedimento ? resolverPorNome(cat.procedimentos, procedimento, "Procedimento") : null;
    const c = clinica ? resolverClinica(cat.clinicas, clinica) : null;
    const previa = {
      padrao,
      acao: proc ? `${proc.nome} (${brl(Number(proc.custo_fixo))})` : "ignorar (sem custo)",
      prioridade,
      vale_para: c?.nome ?? "todas as clínicas",
    };
    if (!confirmar) return { previa, gravado: false };
    const regra = await amb.deps.criarRegraProcedimento(amb.ctx, {
      padrao,
      procedimento_id: proc?.id ?? null,
      ignorar: proc === null,
      prioridade,
      clinica_id: c?.id ?? null,
      observacao,
    });
    return { ...previa, gravado: true, regra };
  },
});

// ---------- sync, indicações, despesas, comissão ----------

const bsSync = ferramenta({
  nome: "bs_sync",
  descricao:
    "Re-sincroniza orçamentos e pagamentos do mês com o Clinicorp (insere só o que falta; idempotente). Use quando a conferência achar orçamento/pagamento faltando.",
  shape: { clinica: pClinica, mes: pMes, confirmar: pConfirmar },
  executar: async ({ clinica, mes, confirmar }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    if (!confirmar) {
      return { previa: `Vai sincronizar ${c.nome} ${mes} com o Clinicorp (só insere o que falta) e recalcular o resumo.`, gravado: false };
    }
    return amb.deps.sincronizarMes(amb.ctx, { clinica_id: c.id, mes });
  },
});

const bsIndicacao = ferramenta({
  nome: "bs_indicacao",
  descricao:
    "Define (ou limpa) o médico indicador de um orçamento. Gera comissão médica (percentual do médico sobre o valor do orçamento), que é custo antes do split.",
  shape: {
    orcamento_id: z.string().uuid(),
    medico: z.string().nullable().describe("Nome ou id do médico; null = sem indicação"),
    confirmar: pConfirmar,
  },
  executar: async ({ orcamento_id, medico, confirmar }, amb, catalogo) => {
    const m = medico ? resolverPorNome((await catalogo()).medicos, medico, "Médico") : null;
    const previa = { orcamento_id, medico: m ? `${m.nome} (${m.percentual_comissao}%)` : "sem indicação" };
    if (!confirmar) return { previa, gravado: false };
    await amb.deps.definirIndicacao(amb.ctx, { orcamento_id, medico_indicador_id: m?.id ?? null });
    return { ...previa, gravado: true };
  },
});

const bsLancarDespesa = ferramenta({
  nome: "bs_lancar_despesa",
  descricao:
    "Lança despesa operacional da clínica no mês (custo exclusivo da Beauty Smile, fora do split). Categorias recorrentes por unidade: Salário Dentista, Assinatura Clinicorp, Mensalidade Biologix, Insumos para Atendimento.",
  shape: {
    clinica: pClinica,
    mes: pMes,
    categoria: z.string().describe("Nome da categoria (ver bs_catalogo)"),
    valor: z.number().positive(),
    descricao: z.string().optional(),
    recorrente: z.boolean().default(true).describe("Recorrente aparece como pendente no mês seguinte se faltar"),
    confirmar: pConfirmar,
  },
  executar: async ({ clinica, mes, categoria, valor, descricao, recorrente, confirmar }, amb, catalogo) => {
    const cat = await catalogo();
    const c = resolverClinica(cat.clinicas, clinica);
    const categoriaResolvida = resolverPorNome(cat.categorias_despesa, categoria, "Categoria");
    const previa = { clinica: c.nome, mes, categoria: categoriaResolvida.nome, valor: brl(valor), descricao, recorrente };
    if (!confirmar) return { previa, gravado: false };
    const despesa = await amb.deps.lancarDespesa(amb.ctx, {
      clinica_id: c.id,
      mes,
      categoria: categoriaResolvida.nome,
      valor,
      descricao,
      recorrente,
    });
    return { ...previa, gravado: true, despesa };
  },
});

const bsComissaoDentista = ferramenta({
  nome: "bs_comissao_dentista",
  descricao:
    "Recalcula a comissão da(s) dentista(s) da clínica no mês (BS paga 100%, fora do split; cortesia não conta como venda; comissão já paga não é alterada).",
  shape: { clinica: pClinica, mes: pMes, confirmar: pConfirmar },
  executar: async ({ clinica, mes, confirmar }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    if (!confirmar) return { previa: `Vai recalcular a comissão da dentista de ${c.nome} em ${mes} com a regra vigente.`, gravado: false };
    return amb.deps.recalcularComissaoDentista(amb.ctx, { clinica_id: c.id, mes });
  },
});

const bsRecalcular = ferramenta({
  nome: "bs_recalcular",
  descricao:
    "Recalcula o resumo mensal (faturamento, custos, split 60/40, recebido, inadimplência) da clínica no mês. Seguro: só recalcula a partir dos dados já gravados. Devolve o checklist atualizado.",
  shape: { clinica: pClinica, mes: pMes },
  executar: async ({ clinica, mes }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    await amb.deps.recalcularResumo(amb.ctx, { clinica_id: c.id, mes });
    return { clinica: c.nome, ...(await amb.deps.statusFechamento(amb.ctx, { clinica_id: c.id, mes })) };
  },
});

// ---------- fechar / reabrir ----------

const pDecisoes = z.array(z.object({ passo: z.string().optional(), texto: z.string() })).default([]);
const pDivergencias = z
  .array(z.object({ passo: z.string().optional(), fonte: z.string().optional(), descricao: z.string(), valor: z.number().optional() }))
  .default([]);

const ICONE: Record<string, string> = { ok: "✅", atencao: "⚠️", pendente: "⏳" };

const bsFechar = ferramenta({
  nome: "bs_fechar",
  descricao:
    "Fecha o mês da clínica: recalcula, grava o registro do fechamento (números + decisões + divergências aceitas) e trava o mês. Registre TODAS as decisões tomadas no fechamento.",
  shape: { clinica: pClinica, mes: pMes, decisoes: pDecisoes, divergencias: pDivergencias, confirmar: pConfirmar },
  executar: async ({ clinica, mes, decisoes, divergencias, confirmar }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    if (!confirmar) {
      const status: StatusFechamento = await amb.deps.statusFechamento(amb.ctx, { clinica_id: c.id, mes });
      return {
        previa: {
          clinica: c.nome,
          mes,
          ja_fechado: status.fechado,
          checklist: status.checklist.map((i) => `${ICONE[i.nivel] ?? "•"} ${i.passo}: ${i.resumo}`),
          decisoes,
          divergencias,
        },
        gravado: false,
      };
    }
    return amb.deps.fecharMes(amb.ctx, { clinica_id: c.id, mes, decisoes, divergencias });
  },
});

const bsReabrir = ferramenta({
  nome: "bs_reabrir",
  descricao: "Reabre o mês fechado de uma clínica (o fechamento anterior fica no histórico). Exige motivo.",
  shape: { clinica: pClinica, mes: pMes, motivo: z.string().min(3), confirmar: pConfirmar },
  executar: async ({ clinica, mes, motivo, confirmar }, amb, catalogo) => {
    const c = resolverClinica((await catalogo()).clinicas, clinica);
    if (!confirmar) return { previa: `Vai reabrir ${c.nome} ${mes}. Motivo: ${motivo}`, gravado: false };
    return amb.deps.reabrirMes(amb.ctx, { clinica_id: c.id, mes, motivo });
  },
});

export const FERRAMENTAS: Ferramenta[] = [
  bsConexao,
  bsCatalogo,
  bsStatus,
  bsRelatorio,
  bsMapearProcedimentos,
  bsGravarProcedimentos,
  bsCriarRegra,
  bsSync,
  bsIndicacao,
  bsLancarDespesa,
  bsComissaoDentista,
  bsRecalcular,
  bsFechar,
  bsReabrir,
];

/** Valida o input com o schema da tool (aplica defaults) e executa. */
export async function executarFerramenta(nome: string, input: unknown, amb: Ambiente): Promise<unknown> {
  const f = FERRAMENTAS.find((x) => x.nome === nome);
  if (!f) throw new Error(`Tool desconhecida: ${nome}`);
  return f.executar(z.object(f.shape).parse(input ?? {}), amb);
}
