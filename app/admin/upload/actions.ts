"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClinicaOption = { id: string; nome: string };

/** Lista clínicas ativas para select (upload, etc.) */
export async function getClinicasAtivas(): Promise<ClinicaOption[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  if (error) return [];
  return (data ?? []).map((r) => ({ id: r.id, nome: r.nome }));
}

export type UploadBatchExists = {
  tipo: "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados";
  exists: boolean;
};

/** Verifica se já existe batch para clinica + mes (para orcamentos verifica fechados e abertos) */
export async function checkExistingBatches(
  clinicaId: string,
  mesReferencia: string,
  tipoPlanilha: "orcamentos" | "tratamentos_executados"
): Promise<UploadBatchExists[]> {
  const supabase = createSupabaseServerClient();

  if (tipoPlanilha === "orcamentos") {
    const [f, a] = await Promise.all([
      supabase
        .from("upload_batches")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", mesReferencia)
        .eq("tipo", "orcamentos_fechados")
        .maybeSingle(),
      supabase
        .from("upload_batches")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", mesReferencia)
        .eq("tipo", "orcamentos_abertos")
        .maybeSingle(),
    ]);
    return [
      { tipo: "orcamentos_fechados", exists: !!f.data?.id },
      { tipo: "orcamentos_abertos", exists: !!a.data?.id },
    ];
  }

  const { data } = await supabase
    .from("upload_batches")
    .select("id")
    .eq("clinica_id", clinicaId)
    .eq("mes_referencia", mesReferencia)
    .eq("tipo", "tratamentos_executados")
    .maybeSingle();

  return [{ tipo: "tratamentos_executados", exists: !!data?.id }];
}

export type ClinicaUploadStatus = {
  clinicaId: string;
  clinicaNome: string;
  orcamentosFechados: boolean;
  orcamentosAbertos: boolean;
  tratamentos: boolean;
};

export async function getMonthlyUploadStatus(mesReferencia: string): Promise<ClinicaUploadStatus[]> {
  const supabase = createSupabaseServerClient();

  const [{ data: clinicas }, { data: batches }] = await Promise.all([
    supabase.from("clinicas_parceiras").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("upload_batches")
      .select("clinica_id, tipo")
      .eq("mes_referencia", mesReferencia)
      .eq("status", "concluido"),
  ]);

  const byClinica: Record<string, { of: boolean; oa: boolean; te: boolean }> = {};
  (clinicas ?? []).forEach((c) => {
    byClinica[c.id] = { of: false, oa: false, te: false };
  });
  (batches ?? []).forEach((b) => {
    const id = b.clinica_id as string;
    if (!byClinica[id]) return;
    if (b.tipo === "orcamentos_fechados") byClinica[id].of = true;
    if (b.tipo === "orcamentos_abertos") byClinica[id].oa = true;
    if (b.tipo === "tratamentos_executados") byClinica[id].te = true;
  });

  return (clinicas ?? []).map((c) => ({
    clinicaId: c.id,
    clinicaNome: c.nome,
    orcamentosFechados: byClinica[c.id]?.of ?? false,
    orcamentosAbertos: byClinica[c.id]?.oa ?? false,
    tratamentos: byClinica[c.id]?.te ?? false,
  }));
}

export type UploadBatchRow = {
  id: string;
  clinica_id: string;
  clinica_nome: string;
  mes_referencia: string;
  tipo: string;
  arquivo_nome: string | null;
  total_registros: number;
  status: string;
  uploaded_at: string;
  uploader_nome: string | null;
};

export type HistoricoFilters = {
  clinica_id?: string;
  mes?: string;
  tipo?: string;
  status?: string;
};

/** Lista batches para histórico com filtros */
export async function listUploadBatches(filters: HistoricoFilters = {}): Promise<UploadBatchRow[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("upload_batches")
    .select(`
      id,
      clinica_id,
      mes_referencia,
      tipo,
      arquivo_nome,
      total_registros,
      status,
      created_at,
      uploaded_by,
      clinicas_parceiras(nome)
    `)
    .order("created_at", { ascending: false });

  if (filters.clinica_id) query = query.eq("clinica_id", filters.clinica_id);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.mes) {
    const start = `${filters.mes}-01`;
    const [y, m] = filters.mes.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${filters.mes}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }

  const { data, error } = await query;
  if (error) return [];

  const ids = (data ?? []).map((r) => (r as { uploaded_by?: string }).uploaded_by).filter(Boolean) as string[];
  let profiles: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .in("id", Array.from(new Set(ids)));
    (profData ?? []).forEach((p) => {
      profiles[p.id] = p.nome || p.email || p.id.slice(0, 8);
    });
  }

  type Row = {
    id: string;
    clinica_id: string;
    mes_referencia: string;
    tipo: string;
    arquivo_nome: string | null;
    total_registros: number;
    status: string;
    created_at: string;
    uploaded_by: string | null;
    clinicas_parceiras: { nome: string }[] | { nome: string } | null;
  };
  const rows = (data ?? []) as Row[];
  return rows.map((r) => {
    const clinica = r.clinicas_parceiras;
    const clinicaNome =
      clinica == null
        ? "—"
        : Array.isArray(clinica)
          ? clinica[0]?.nome ?? "—"
          : clinica.nome ?? "—";
    return {
      id: r.id,
      clinica_id: r.clinica_id,
      clinica_nome: clinicaNome,
      mes_referencia: r.mes_referencia.slice(0, 7),
      tipo: r.tipo,
      arquivo_nome: r.arquivo_nome ?? null,
      total_registros: r.total_registros ?? 0,
      status: r.status,
      uploaded_at: r.created_at,
      uploader_nome: r.uploaded_by ? profiles[r.uploaded_by] ?? null : null,
    };
  });
}

export type BatchDetailRecord = {
  id: string;
  paciente_nome?: string;
  valor_total?: number;
  procedimento_nome?: string;
  quantidade?: number;
  data_execucao?: string;
  data_fechamento?: string;
};

export type BatchDetail = {
  batch: UploadBatchRow;
  registros: BatchDetailRecord[];
  total: number;
};

/** Detalhe do batch com até 100 registros */
export async function getBatchDetail(batchId: string): Promise<BatchDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data: batchRow, error: batchError } = await supabase
    .from("upload_batches")
    .select(`
      id, clinica_id, mes_referencia, tipo, arquivo_nome, total_registros, status, created_at, uploaded_by,
      clinicas_parceiras(nome)
    `)
    .eq("id", batchId)
    .single();

  if (batchError || !batchRow) return null;

  type BatchRow = {
    id: string;
    clinica_id: string;
    mes_referencia: string;
    tipo: string;
    arquivo_nome: string | null;
    total_registros: number;
    status: string;
    created_at: string;
    uploaded_by: string | null;
    clinicas_parceiras: { nome: string }[] | { nome: string } | null;
  };
  const b = batchRow as BatchRow;
  const clinicaNome =
    b.clinicas_parceiras == null
      ? "—"
      : Array.isArray(b.clinicas_parceiras)
        ? b.clinicas_parceiras[0]?.nome ?? "—"
        : b.clinicas_parceiras.nome ?? "—";
  let uploaderNome: string | null = null;
  if (b.uploaded_by) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", b.uploaded_by)
      .single();
    uploaderNome = (prof?.nome || prof?.email || null) as string | null;
  }
  const batch: UploadBatchRow = {
    id: b.id,
    clinica_id: b.clinica_id,
    clinica_nome: clinicaNome,
    mes_referencia: (b.mes_referencia as string).slice(0, 7),
    tipo: b.tipo as string,
    arquivo_nome: (b.arquivo_nome as string) ?? null,
    total_registros: (b.total_registros as number) ?? 0,
    status: b.status as string,
    uploaded_at: b.created_at as string,
    uploader_nome: uploaderNome,
  };

  const tipo = b.tipo as string;
  let registros: BatchDetailRecord[] = [];
  const limit = 100;

  if (tipo === "orcamentos_fechados") {
    const { data: rows } = await supabase
      .from("orcamentos_fechados")
      .select("id, paciente_nome, valor_total, data_fechamento")
      .eq("upload_batch_id", batchId)
      .limit(limit);
    registros = (rows ?? []).map((r) => ({
      id: r.id,
      paciente_nome: r.paciente_nome,
      valor_total: r.valor_total,
      data_fechamento: r.data_fechamento,
    }));
  } else if (tipo === "orcamentos_abertos") {
    const { data: rows } = await supabase
      .from("orcamentos_abertos")
      .select("id, paciente_nome, valor_total")
      .eq("upload_batch_id", batchId)
      .limit(limit);
    registros = (rows ?? []).map((r) => ({
      id: r.id,
      paciente_nome: r.paciente_nome,
      valor_total: r.valor_total,
    }));
  } else {
    const { data: rows } = await supabase
      .from("tratamentos_executados")
      .select("id, paciente_nome, procedimento_nome, quantidade, data_execucao")
      .eq("upload_batch_id", batchId)
      .limit(limit);
    registros = (rows ?? []).map((r) => ({
      id: r.id,
      paciente_nome: r.paciente_nome,
      procedimento_nome: r.procedimento_nome,
      quantidade: r.quantidade,
      data_execucao: r.data_execucao,
    }));
  }

  const tableName = tipo === "orcamentos_fechados" ? "orcamentos_fechados" : tipo === "orcamentos_abertos" ? "orcamentos_abertos" : "tratamentos_executados";
  const { count } = await supabase.from(tableName).select("id", { count: "exact", head: true }).eq("upload_batch_id", batchId);

  return {
    batch,
    registros,
    total: count ?? registros.length,
  };
}
