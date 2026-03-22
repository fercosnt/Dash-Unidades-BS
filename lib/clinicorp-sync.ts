/**
 * Lógica core de sincronização Clinicorp → Supabase.
 * Reusável pelo endpoint manual (/api/admin/clinicorp/sync) e pelo cron (/api/cron/clinicorp-sync).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listEstimates, listPayments, getClinicorpCredentials } from "@/lib/clinicorp-client";
import {
  transformEstimates,
  transformPayments,
  transformTratamentosExecutados,
} from "@/lib/clinicorp-transforms";
import { isMesFechado } from "@/app/admin/configuracoes/fechamento/actions";
import { matchProcedimentoPorNome } from "@/lib/utils/match-procedimento";
import {
  splitOrcamento,
  type ProcedimentoRef,
  type OrcamentoParaSplit,
} from "@/lib/utils/split-orcamento";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";
import type { ClinicorpSyncPreview, ClinicorpSyncResult } from "@/types/clinicorp.types";

export interface SyncOptions {
  dryRun?: boolean;
  trigger: "cron" | "manual";
  userId?: string;
  skipRecalculate?: boolean;
}

export interface SyncResponse {
  dryRun: boolean;
  preview?: ClinicorpSyncPreview;
  result?: ClinicorpSyncResult;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Sincroniza dados de uma clínica+mês do Clinicorp para o Supabase.
 * Inclui: orçamentos fechados/abertos, pagamentos e tratamentos executados.
 * Após inserção, recalcula resumo_mensal automaticamente.
 */
export async function syncClinicaMonth(
  clinicaId: string,
  mesReferencia: string,
  options: SyncOptions
): Promise<SyncResponse> {
  const admin = createSupabaseAdminClient();

  // Verificar mês fechado
  const mesFechado = await isMesFechado(mesReferencia.slice(0, 7));
  if (mesFechado) {
    return {
      dryRun: false,
      skipped: true,
      skipReason: `Mês ${mesReferencia.slice(0, 7)} está fechado`,
    };
  }

  // Buscar credenciais
  const credentials = await getClinicorpCredentials(clinicaId, admin);
  if (!credentials) {
    throw new Error(
      "Clínica sem credenciais Clinicorp configuradas. Configure em Configurações > Clínicas."
    );
  }

  // Calcular intervalo do mês
  const from = mesReferencia;
  const mesDate = new Date(mesReferencia + "T00:00:00");
  const lastDay = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0);
  const to = lastDay.toISOString().slice(0, 10);

  // Buscar dados da API Clinicorp
  const [apiEstimates, apiPayments] = await Promise.all([
    listEstimates(credentials, from, to),
    listPayments(credentials, from, to),
  ]);

  // Transformar dados
  const { fechados, abertos } = transformEstimates(apiEstimates);
  const pagamentos = transformPayments(apiPayments);
  const tratamentos = transformTratamentosExecutados(apiEstimates, mesReferencia);

  // --- DRY RUN ---
  if (options.dryRun) {
    const preview: ClinicorpSyncPreview = {
      orcamentos_fechados: fechados.length,
      orcamentos_abertos: abertos.length,
      pagamentos: pagamentos.length,
      tratamentos_executados: tratamentos.length,
      detalhes: {
        fechados: fechados.map((f) => ({
          paciente: f.paciente_nome,
          valor: f.valor_total,
          profissional: f.profissional ?? "",
        })),
        pagamentos: pagamentos.map((p) => ({
          paciente: "",
          valor: p.valor,
          forma: p.forma,
        })),
        tratamentos: tratamentos.map((t) => ({
          paciente: t.paciente_nome,
          procedimento: t.procedimento_nome,
          data: t.data_execucao ?? "",
        })),
      },
    };
    return { dryRun: true, preview };
  }

  // --- SYNC REAL ---

  // Idempotência: verificar existentes
  const [existingFechados, existingAbertos, existingPagamentos] =
    await Promise.all([
      admin
        .from("orcamentos_fechados")
        .select("clinicorp_treatment_id")
        .eq("clinica_id", clinicaId)
        .in(
          "clinicorp_treatment_id",
          fechados.length > 0
            ? fechados.map((f) => f.clinicorp_treatment_id)
            : [-1]
        ),
      admin
        .from("orcamentos_abertos")
        .select("clinicorp_treatment_id")
        .eq("clinica_id", clinicaId)
        .in(
          "clinicorp_treatment_id",
          abertos.length > 0
            ? abertos.map((a) => a.clinicorp_treatment_id)
            : [-1]
        ),
      admin
        .from("pagamentos")
        .select("clinicorp_payment_id")
        .eq("clinica_id", clinicaId)
        .in(
          "clinicorp_payment_id",
          pagamentos.length > 0
            ? pagamentos.map((p) => p.clinicorp_payment_id)
            : [-1]
        ),
    ]);

  const existingTreatmentIdsFechados = new Set(
    (existingFechados.data ?? []).map((r) => r.clinicorp_treatment_id)
  );
  const existingTreatmentIdsAbertos = new Set(
    (existingAbertos.data ?? []).map((r) => r.clinicorp_treatment_id)
  );
  const existingPaymentIds = new Set(
    (existingPagamentos.data ?? []).map((r) => r.clinicorp_payment_id)
  );

  const novosFechados = fechados.filter(
    (f) => !existingTreatmentIdsFechados.has(f.clinicorp_treatment_id)
  );
  const novosAbertos = abertos.filter(
    (a) => !existingTreatmentIdsAbertos.has(a.clinicorp_treatment_id)
  );
  const novosPagamentos = pagamentos.filter(
    (p) => !existingPaymentIds.has(p.clinicorp_payment_id)
  );

  const result: ClinicorpSyncResult = {
    orcamentos_fechados_inseridos: 0,
    orcamentos_fechados_ignorados: fechados.length - novosFechados.length,
    orcamentos_abertos_inseridos: 0,
    orcamentos_abertos_ignorados: abertos.length - novosAbertos.length,
    pagamentos_inseridos: 0,
    pagamentos_ignorados: pagamentos.length - novosPagamentos.length,
    tratamentos_inseridos: 0,
  };

  // Criar upload batch para rastreabilidade
  let batchId: string | null = null;
  if (novosFechados.length > 0 || novosAbertos.length > 0) {
    const { data: batch, error: batchError } = await admin
      .from("upload_batches")
      .insert({
        clinica_id: clinicaId,
        mes_referencia: mesReferencia,
        tipo: "orcamentos_fechados",
        arquivo_nome: `clinicorp_sync_${mesReferencia}`,
        status: "processando",
        total_registros: novosFechados.length + novosAbertos.length,
        uploaded_by: options.userId ?? null,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      throw new Error(batchError?.message ?? "Erro ao criar batch");
    }
    batchId = batch.id;
  }

  // Inserir orçamentos fechados
  if (novosFechados.length > 0 && batchId) {
    const rows = novosFechados.map((f) => ({
      clinica_id: clinicaId,
      mes_referencia: mesReferencia,
      paciente_nome: f.paciente_nome || "(sem nome)",
      valor_total: f.valor_total,
      valor_pago: 0,
      data_fechamento: f.data_fechamento,
      upload_batch_id: batchId,
      profissional: f.profissional,
      paciente_telefone: f.paciente_telefone,
      procedimentos_texto: f.procedimentos_texto,
      valor_bruto: f.valor_bruto,
      desconto_percentual: f.desconto_percentual,
      tem_indicacao: f.tem_indicacao,
      clinicorp_treatment_id: f.clinicorp_treatment_id,
      origem: "clinicorp" as const,
    }));

    const { error: insertError } = await admin
      .from("orcamentos_fechados")
      .insert(rows);

    if (insertError) {
      console.error("[clinicorp-sync] Erro ao inserir fechados:", insertError.message);
      if (batchId) await admin.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
      throw new Error(insertError.message);
    }

    result.orcamentos_fechados_inseridos = novosFechados.length;

    // Auto-split (best-effort)
    try {
      const { data: insertedOrcs } = await admin
        .from("orcamentos_fechados")
        .select("id, clinica_id, procedimentos_texto, valor_total, valor_bruto, desconto_reais")
        .eq("upload_batch_id", batchId);

      if (insertedOrcs?.length) {
        const { data: procList } = await admin
          .from("procedimentos")
          .select("id, nome, codigo_clinicorp, valor_tabela, categoria")
          .eq("ativo", true);
        const procs = (procList ?? []) as ProcedimentoRef[];

        const allItems: Array<Record<string, unknown>> = [];
        const orcIds: string[] = [];

        for (const orc of insertedOrcs as OrcamentoParaSplit[]) {
          const splitResult = splitOrcamento(orc, procs);
          orcIds.push(orc.id);
          for (const item of splitResult.items) {
            allItems.push({
              orcamento_fechado_id: orc.id,
              clinica_id: orc.clinica_id,
              procedimento_id: item.procedimento_id,
              procedimento_nome_original: item.procedimento_nome_original,
              quantidade: 1,
              valor_tabela: item.valor_tabela,
              valor_proporcional: item.valor_proporcional,
              categoria: item.categoria,
              match_status: item.match_status,
            });
          }
        }

        if (allItems.length > 0) {
          await admin.from("itens_orcamento").insert(allItems);
        }
        if (orcIds.length > 0) {
          await admin
            .from("orcamentos_fechados")
            .update({ split_status: "auto" })
            .in("id", orcIds);
        }
      }
    } catch (err) {
      console.error("[clinicorp-sync] Erro no auto-split:", err instanceof Error ? err.message : err);
    }
  }

  // Inserir orçamentos abertos
  if (novosAbertos.length > 0 && batchId) {
    const rows = novosAbertos.map((a) => ({
      clinica_id: clinicaId,
      mes_referencia: mesReferencia,
      paciente_nome: a.paciente_nome || "(sem nome)",
      valor_total: a.valor_total,
      status: a.status,
      data_criacao: a.data_criacao,
      upload_batch_id: batchId,
      profissional: a.profissional,
      clinicorp_treatment_id: a.clinicorp_treatment_id,
      origem: "clinicorp" as const,
    }));

    const { error: insertError } = await admin
      .from("orcamentos_abertos")
      .insert(rows);

    if (insertError) {
      console.error("[clinicorp-sync] Erro ao inserir abertos:", insertError.message);
    } else {
      result.orcamentos_abertos_inseridos = novosAbertos.length;
    }
  }

  // Inserir pagamentos
  if (novosPagamentos.length > 0) {
    const allTreatmentIds = novosPagamentos.map((p) => p.clinicorp_treatment_id);
    const { data: orcMap } = await admin
      .from("orcamentos_fechados")
      .select("id, clinicorp_treatment_id")
      .eq("clinica_id", clinicaId)
      .in("clinicorp_treatment_id", allTreatmentIds);

    const treatmentToOrc = new Map(
      (orcMap ?? []).map((o) => [o.clinicorp_treatment_id, o.id])
    );

    for (const pag of novosPagamentos) {
      const orcFechadoId = treatmentToOrc.get(pag.clinicorp_treatment_id);
      if (!orcFechadoId) {
        console.error(
          `[clinicorp-sync] Pagamento sem orçamento: clinicorp_treatment_id=${pag.clinicorp_treatment_id}`
        );
        continue;
      }

      const { data: rpcResult, error: rpcError } = await admin.rpc(
        "registrar_pagamento",
        {
          p_orcamento_fechado_id: orcFechadoId,
          p_valor: pag.valor,
          p_forma: pag.forma,
          p_parcelas: pag.parcelas,
          p_data_pagamento: pag.data_pagamento,
          p_registrado_por: options.userId ?? null,
        }
      );

      if (rpcError) {
        console.error(
          `[clinicorp-sync] Erro RPC pagamento (treatment=${pag.clinicorp_treatment_id}):`,
          rpcError.message
        );
        continue;
      }

      const rpcData = rpcResult as Record<string, unknown> | null;
      const pagRecord = rpcData?.pagamento as Record<string, unknown> | undefined;
      const pagId = pagRecord?.id as string | undefined;

      if (pagId) {
        await admin
          .from("pagamentos")
          .update({
            bandeira: pag.bandeira,
            clinicorp_payment_id: pag.clinicorp_payment_id,
            origem: "clinicorp",
          })
          .eq("id", pagId);
      }

      result.pagamentos_inseridos++;
    }
  }

  // Tratamentos executados: replace por mês (delete + re-insert)
  if (tratamentos.length > 0) {
    // Deletar tratamentos anteriores do Clinicorp para este mês
    await admin
      .from("tratamentos_executados")
      .delete()
      .eq("clinica_id", clinicaId)
      .eq("mes_referencia", mesReferencia)
      .eq("origem", "clinicorp");

    // Buscar procedimentos para match
    const { data: procList } = await admin
      .from("procedimentos")
      .select("id, nome, codigo_clinicorp")
      .eq("ativo", true);

    const procs = (procList ?? []) as Array<{ id: string; nome: string; codigo_clinicorp: string | null }>;

    const rows = tratamentos.map((t) => {
      const match = matchProcedimentoPorNome(t.procedimento_nome, procs as never[]);
      return {
        clinica_id: clinicaId,
        mes_referencia: mesReferencia,
        paciente_nome: t.paciente_nome,
        procedimento_nome: t.procedimento_nome,
        procedimento_id: match ? (match as Record<string, unknown>).id as string : null,
        data_execucao: t.data_execucao,
        quantidade: t.quantidade,
        profissional: t.profissional ?? null,
        origem: "clinicorp" as const,
      };
    });

    const { error: insertError } = await admin
      .from("tratamentos_executados")
      .insert(rows);

    if (insertError) {
      console.error("[clinicorp-sync] Erro ao inserir tratamentos:", insertError.message);
    } else {
      result.tratamentos_inseridos = tratamentos.length;
    }
  }

  // Atualizar batch como concluído
  if (batchId) {
    await admin
      .from("upload_batches")
      .update({
        status: "concluido",
        total_registros:
          result.orcamentos_fechados_inseridos + result.orcamentos_abertos_inseridos,
      })
      .eq("id", batchId);
  }

  // Recalcular resumo mensal automaticamente
  if (!options.skipRecalculate) {
    try {
      const calcResult = await calcularEPersistirResumo(clinicaId, mesReferencia);
      if (!calcResult.ok) {
        console.error("[clinicorp-sync] Erro no recálculo:", calcResult.error);
      }
    } catch (err) {
      console.error("[clinicorp-sync] Erro no recálculo:", err instanceof Error ? err.message : err);
    }
  }

  return { dryRun: false, result };
}
