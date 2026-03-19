"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";

function firstDay(mes: string): string {
  return `${mes}-01`;
}

function lastDay(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

async function requireAdmin(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Acesso negado");
  return user.id;
}

export type FechamentoMesItem = {
  mesReferencia: string;
  mesLabel: string;
  clinicasTotal: number;
  faturamentoTotal: number;
  fechado: boolean;
  fechadoEm: string | null;
  fechadoPorNome: string | null;
  splitTotal: number;
  splitFeitos: number;
  splitUnmatched: number;
};

export async function fetchFechamentoStatus(): Promise<FechamentoMesItem[]> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: resumos } = await admin
    .from("resumo_mensal")
    .select("mes_referencia, clinica_id, faturamento_bruto, fechado_em, fechado_por")
    .order("mes_referencia", { ascending: false });

  if (!resumos?.length) return [];

  // Agrupar por mês
  const byMes: Record<string, {
    clinicas: Set<string>;
    faturamento: number;
    fechadoEm: string | null;
    fechadoPor: string | null;
    todosFechados: boolean;
  }> = {};

  for (const r of resumos) {
    const mes = (r.mes_referencia as string).slice(0, 7);
    if (!byMes[mes]) {
      byMes[mes] = { clinicas: new Set(), faturamento: 0, fechadoEm: null, fechadoPor: null, todosFechados: true };
    }
    byMes[mes]!.clinicas.add(r.clinica_id as string);
    byMes[mes]!.faturamento += Number(r.faturamento_bruto ?? 0);
    if (!r.fechado_em) {
      byMes[mes]!.todosFechados = false;
    } else {
      byMes[mes]!.fechadoEm = r.fechado_em as string;
      byMes[mes]!.fechadoPor = r.fechado_por as string | null;
    }
  }

  // Buscar nomes dos admins que fecharam
  const adminIds = [...new Set(
    Object.values(byMes)
      .map((v) => v.fechadoPor)
      .filter(Boolean) as string[]
  )];

  const nomeByAdmin: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nome")
      .in("id", adminIds);
    (profiles ?? []).forEach((p) => { nomeByAdmin[p.id] = p.nome ?? "Admin"; });
  }

  // Buscar dados de split por mes
  const mesesList = Object.keys(byMes);
  const splitByMes: Record<string, { total: number; feitos: number; unmatched: number }> = {};

  for (const mes of mesesList) {
    const s = firstDay(mes);
    const e = lastDay(mes);
    const { data: orcs } = await admin
      .from("orcamentos_fechados")
      .select("id, split_status")
      .gte("mes_referencia", s)
      .lte("mes_referencia", e);

    const rows = orcs ?? [];
    const feitos = rows.filter((r) => r.split_status !== null).length;
    const feitosIds = rows.filter((r) => r.split_status !== null).map((r) => r.id);

    let unmatched = 0;
    if (feitosIds.length > 0) {
      const { data: unmData } = await admin
        .from("itens_orcamento")
        .select("orcamento_fechado_id")
        .in("orcamento_fechado_id", feitosIds)
        .eq("match_status", "unmatched");
      unmatched = new Set((unmData ?? []).map((r) => r.orcamento_fechado_id)).size;
    }

    splitByMes[mes] = { total: rows.length, feitos, unmatched };
  }

  return Object.entries(byMes)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([mes, v]) => {
      const [y, m] = mes.split("-");
      const sp = splitByMes[mes] ?? { total: 0, feitos: 0, unmatched: 0 };
      return {
        mesReferencia: mes,
        mesLabel: `${MONTHS[Number(m) - 1]}/${y}`,
        clinicasTotal: v.clinicas.size,
        faturamentoTotal: v.faturamento,
        fechado: v.todosFechados,
        fechadoEm: v.fechadoEm,
        fechadoPorNome: v.fechadoPor ? (nomeByAdmin[v.fechadoPor] ?? "Admin") : null,
        splitTotal: sp.total,
        splitFeitos: sp.feitos,
        splitUnmatched: sp.unmatched,
      };
    });
}

export async function fecharMes(mesReferencia: string): Promise<{
  ok: boolean;
  sucesso: number;
  total: number;
  falhas: { clinicaId: string; error: string }[];
}> {
  const userId = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: clinicas } = await admin
    .from("clinicas_parceiras")
    .select("id")
    .eq("ativo", true);

  const ids = (clinicas ?? []).map((c) => c.id);
  if (ids.length === 0) return { ok: true, sucesso: 0, total: 0, falhas: [] };

  const falhas: { clinicaId: string; error: string }[] = [];
  let sucesso = 0;

  for (const clinicaId of ids) {
    const result = await calcularEPersistirResumo(clinicaId, mesReferencia);
    if (result.ok) {
      sucesso++;
    } else {
      falhas.push({ clinicaId, error: result.error });
    }
  }

  // Marcar como fechado
  const start = firstDay(mesReferencia);
  const end = lastDay(mesReferencia);
  await admin
    .from("resumo_mensal")
    .update({ fechado_em: new Date().toISOString(), fechado_por: userId })
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  return { ok: falhas.length === 0, sucesso, total: ids.length, falhas };
}

export async function reabrirMes(mesReferencia: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const start = firstDay(mesReferencia);
  const end = lastDay(mesReferencia);

  const { error } = await admin
    .from("resumo_mensal")
    .update({ fechado_em: null, fechado_por: null })
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  return { ok: !error };
}

/** Retorna lista de meses fechados (formato YYYY-MM) para uso no PeriodoSelector */
export async function fetchMesesFechados(): Promise<string[]> {
  const admin = createSupabaseAdminClient();

  const { data: resumos } = await admin
    .from("resumo_mensal")
    .select("mes_referencia, fechado_em");

  if (!resumos?.length) return [];

  // Agrupar por mês — só retorna se TODOS os registros do mês estão fechados
  const byMes: Record<string, { total: number; fechados: number }> = {};
  for (const r of resumos) {
    const mes = (r.mes_referencia as string).slice(0, 7);
    if (!byMes[mes]) byMes[mes] = { total: 0, fechados: 0 };
    byMes[mes]!.total++;
    if (r.fechado_em) byMes[mes]!.fechados++;
  }

  return Object.entries(byMes)
    .filter(([, v]) => v.total > 0 && v.total === v.fechados)
    .map(([mes]) => mes);
}

/** Verifica se um mês específico está fechado (para bloqueio de upload) */
export async function isMesFechado(mesReferencia: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const start = firstDay(mesReferencia);
  const end = lastDay(mesReferencia);

  const { data } = await admin
    .from("resumo_mensal")
    .select("fechado_em")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (!data?.length) return false;
  return data.every((r) => r.fechado_em != null);
}
