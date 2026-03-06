"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ClinicaOption = { id: string; nome: string };

/** Lista clínicas ativas para select (upload, etc.) */
export async function getClinicasAtivas(): Promise<ClinicaOption[]> {
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
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

type TipoPlanilha = "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados";

type UpdateBatchRecordInput = {
  batchId: string;
  tipo: TipoPlanilha;
  id: string;
  paciente_nome?: string;
  valor_total?: number;
};

export async function updateBatchRecord(
  input: UpdateBatchRecordInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  const updates: Record<string, unknown> = {};
  if (input.paciente_nome !== undefined) updates.paciente_nome = input.paciente_nome;
  if (input.valor_total !== undefined) updates.valor_total = input.valor_total;

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const tableName =
    input.tipo === "orcamentos_fechados"
      ? "orcamentos_fechados"
      : input.tipo === "orcamentos_abertos"
        ? "orcamentos_abertos"
        : "tratamentos_executados";

  const { error } = await supabase
    .from(tableName)
    .update(updates)
    .eq("id", input.id)
    .eq("upload_batch_id", input.batchId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/upload/historico");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

type CreateBatchRecordInput = {
  batchId: string;
  tipo: TipoPlanilha;
  paciente_nome: string;
  valor_total?: number;
};

export async function createBatchRecord(
  input: CreateBatchRecordInput,
): Promise<{ ok: boolean; error?: string; record?: BatchDetailRecord }> {
  const supabase = await createSupabaseServerClient();

  const { data: batch, error: batchError } = await supabase
    .from("upload_batches")
    .select("id, clinica_id, mes_referencia, tipo, total_registros")
    .eq("id", input.batchId)
    .single();

  if (batchError || !batch) {
    return { ok: false, error: batchError?.message ?? "Upload não encontrado." };
  }

  if (batch.tipo !== input.tipo) {
    return { ok: false, error: "Tipo de planilha não corresponde ao batch." };
  }

  const base = {
    clinica_id: batch.clinica_id as string,
    mes_referencia: batch.mes_referencia as string,
    paciente_nome: input.paciente_nome,
    upload_batch_id: input.batchId,
  };

  if (!base.paciente_nome.trim()) {
    return { ok: false, error: "Nome do paciente é obrigatório." };
  }

  let tableName: string;
  let insertPayload: Record<string, unknown> = base;

  if (input.tipo === "orcamentos_fechados" || input.tipo === "orcamentos_abertos") {
    const valor = Number(input.valor_total ?? 0);
    if (!valor || Number.isNaN(valor)) {
      return { ok: false, error: "Valor inválido." };
    }
    insertPayload = { ...base, valor_total: valor };
    tableName = input.tipo;
  } else {
    tableName = "tratamentos_executados";
    insertPayload = { ...base, quantidade: 1 };
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert(insertPayload)
    .select("id, paciente_nome, valor_total, procedimento_nome, quantidade, data_execucao, data_fechamento")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao criar registro." };
  }

  const record: BatchDetailRecord = {
    id: data.id as string,
    paciente_nome: data.paciente_nome as string | undefined,
    valor_total: (data as Record<string, unknown>).valor_total as number | undefined,
    procedimento_nome: (data as Record<string, unknown>).procedimento_nome as string | undefined,
    quantidade: (data as Record<string, unknown>).quantidade as number | undefined,
    data_execucao: (data as Record<string, unknown>).data_execucao as string | undefined,
    data_fechamento: (data as Record<string, unknown>).data_fechamento as string | undefined,
  };

  await supabase
    .from("upload_batches")
    .update({ total_registros: (Number((batch as { total_registros?: number }).total_registros) || 0) + 1 })
    .eq("id", input.batchId);

  revalidatePath("/admin/upload/historico");
  revalidatePath("/admin/dashboard");

  return { ok: true, record };
}

export async function deleteBatchRecord(
  batchId: string,
  tipo: TipoPlanilha,
  recordId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  const tableName =
    tipo === "orcamentos_fechados"
      ? "orcamentos_fechados"
      : tipo === "orcamentos_abertos"
        ? "orcamentos_abertos"
        : "tratamentos_executados";

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("id", recordId)
    .eq("upload_batch_id", batchId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/upload/historico");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function updateUploadBatchMonth(
  batchId: string,
  newMonth: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}$/.test(newMonth)) {
    return { ok: false, error: "Mês inválido. Use o formato AAAA-MM." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: batch, error: fetchError } = await supabase
    .from("upload_batches")
    .select("id, tipo")
    .eq("id", batchId)
    .single();

  if (fetchError || !batch) {
    return { ok: false, error: fetchError?.message ?? "Upload não encontrado." };
  }

  const mesReferencia = `${newMonth}-01`;

  const updates: Array<Promise<{ error: { message: string } | null }>> = [];

  updates.push(
    supabase
      .from("upload_batches")
      .update({ mes_referencia: mesReferencia })
      .eq("id", batchId) as any,
  );

  if (batch.tipo === "orcamentos_fechados") {
    updates.push(
      supabase
        .from("orcamentos_fechados")
        .update({ mes_referencia: mesReferencia })
        .eq("upload_batch_id", batchId) as any,
    );
  } else if (batch.tipo === "orcamentos_abertos") {
    updates.push(
      supabase
        .from("orcamentos_abertos")
        .update({ mes_referencia: mesReferencia })
        .eq("upload_batch_id", batchId) as any,
    );
  } else if (batch.tipo === "tratamentos_executados") {
    updates.push(
      supabase
        .from("tratamentos_executados")
        .update({ mes_referencia: mesReferencia })
        .eq("upload_batch_id", batchId) as any,
    );
  }

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { ok: false, error: failed.error.message };
  }

  revalidatePath("/admin/upload/historico");
  revalidatePath("/admin/upload");
  revalidatePath("/admin/upload/revisao");

  return { ok: true };
}

export async function deleteUploadBatch(batchId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  // Remove dependentes na ordem correta (funciona mesmo sem ON DELETE CASCADE no banco)
  const { data: orcamentosIds } = await supabase
    .from("orcamentos_fechados")
    .select("id")
    .eq("upload_batch_id", batchId);
  const ids = (orcamentosIds ?? []).map((r) => r.id);

  if (ids.length > 0) {
    const { data: pagamentosIds } = await supabase
      .from("pagamentos")
      .select("id")
      .in("orcamento_fechado_id", ids);
    const pagIds = (pagamentosIds ?? []).map((p) => p.id);
    if (pagIds.length > 0) {
      const { error: errPc } = await supabase.from("parcelas_cartao").delete().in("pagamento_id", pagIds);
      if (errPc) return { ok: false, error: errPc.message };
    }
    const { error: errPag } = await supabase.from("pagamentos").delete().in("orcamento_fechado_id", ids);
    if (errPag) return { ok: false, error: errPag.message };
  }

  const { error: errOf } = await supabase.from("orcamentos_fechados").delete().eq("upload_batch_id", batchId);
  if (errOf) return { ok: false, error: errOf.message };

  const { error: errOa } = await supabase.from("orcamentos_abertos").delete().eq("upload_batch_id", batchId);
  if (errOa) return { ok: false, error: errOa.message };

  const { error: errTe } = await supabase.from("tratamentos_executados").delete().eq("upload_batch_id", batchId);
  if (errTe) return { ok: false, error: errTe.message };

  const { error } = await supabase.from("upload_batches").delete().eq("id", batchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/upload/historico");
  revalidatePath("/admin/upload");
  revalidatePath("/admin/upload/revisao");

  return { ok: true };
}
