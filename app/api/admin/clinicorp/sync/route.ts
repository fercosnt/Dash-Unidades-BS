import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listEstimates, listPayments, getClinicorpCredentials } from "@/lib/clinicorp-client";
import { transformEstimates, transformPayments } from "@/lib/clinicorp-transforms";
import { isMesFechado } from "@/app/admin/configuracoes/fechamento/actions";
import { matchProcedimentoPorNome } from "@/lib/utils/match-procedimento";
import {
  splitOrcamento,
  type ProcedimentoRef,
  type OrcamentoParaSplit,
} from "@/lib/utils/split-orcamento";
import type { ClinicorpSyncPreview, ClinicorpSyncResult } from "@/types/clinicorp.types";

const syncSchema = z.object({
  clinica_id: z.string().uuid(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}-01$/, "Formato: YYYY-MM-01"),
  dry_run: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const { clinica_id, mes_referencia, dry_run } = parsed.data;

    // Verificar mês fechado
    const mesFechado = await isMesFechado(mes_referencia.slice(0, 7));
    if (mesFechado) {
      return NextResponse.json(
        {
          error: `O mês ${mes_referencia.slice(0, 7)} está fechado. Reabra antes de sincronizar.`,
        },
        { status: 400 }
      );
    }

    // Buscar credenciais Clinicorp da clínica
    const credentials = await getClinicorpCredentials(clinica_id, supabase);
    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "Clínica sem credenciais Clinicorp configuradas. Configure em Configurações > Clínicas.",
        },
        { status: 400 }
      );
    }

    // Calcular intervalo do mês (from/to no formato da API)
    const from = mes_referencia; // "YYYY-MM-01"
    const mesDate = new Date(mes_referencia + "T00:00:00");
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

    // --- DRY RUN: retorna preview ---
    if (dry_run) {
      const preview: ClinicorpSyncPreview = {
        orcamentos_fechados: fechados.length,
        orcamentos_abertos: abertos.length,
        pagamentos: pagamentos.length,
        detalhes: {
          fechados: fechados.map((f) => ({
            paciente: f.paciente_nome,
            valor: f.valor_total,
            profissional: f.profissional ?? "",
          })),
          pagamentos: pagamentos.map((p) => ({
            paciente: "", // será enriquecido no front se necessário
            valor: p.valor,
            forma: p.forma,
          })),
        },
      };
      return NextResponse.json({ dry_run: true, preview });
    }

    // --- SYNC REAL ---

    // Verificar quais já existem (idempotência via clinicorp_treatment_id / clinicorp_payment_id)
    const treatmentIds = [
      ...fechados.map((f) => f.clinicorp_treatment_id),
      ...abertos.map((a) => a.clinicorp_treatment_id),
    ];

    const paymentIds = pagamentos.map((p) => p.clinicorp_payment_id);

    const [existingFechados, existingAbertos, existingPagamentos] =
      await Promise.all([
        supabase
          .from("orcamentos_fechados")
          .select("clinicorp_treatment_id")
          .eq("clinica_id", clinica_id)
          .in(
            "clinicorp_treatment_id",
            fechados.map((f) => f.clinicorp_treatment_id)
          ),
        supabase
          .from("orcamentos_abertos")
          .select("clinicorp_treatment_id")
          .eq("clinica_id", clinica_id)
          .in(
            "clinicorp_treatment_id",
            abertos.map((a) => a.clinicorp_treatment_id)
          ),
        supabase
          .from("pagamentos")
          .select("clinicorp_payment_id")
          .eq("clinica_id", clinica_id)
          .in(
            "clinicorp_payment_id",
            paymentIds.length > 0 ? paymentIds : [-1]
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

    // Filtrar novos (não existentes)
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
    };

    // Criar upload batch para rastreabilidade
    let batchId: string | null = null;
    if (novosFechados.length > 0 || novosAbertos.length > 0) {
      const { data: batch, error: batchError } = await supabase
        .from("upload_batches")
        .insert({
          clinica_id,
          mes_referencia,
          tipo: "orcamentos_fechados",
          arquivo_nome: `clinicorp_sync_${mes_referencia}`,
          status: "processando",
          total_registros: novosFechados.length + novosAbertos.length,
          uploaded_by: user.id,
        })
        .select("id")
        .single();

      if (batchError || !batch) {
        return NextResponse.json(
          { error: batchError?.message ?? "Erro ao criar batch" },
          { status: 500 }
        );
      }
      batchId = batch.id;
    }

    // Inserir orçamentos fechados
    if (novosFechados.length > 0 && batchId) {
      const rows = novosFechados.map((f) => ({
        clinica_id,
        mes_referencia,
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

      const { error: insertError } = await supabase
        .from("orcamentos_fechados")
        .insert(rows);

      if (insertError) {
        console.error("[clinicorp/sync] Erro ao inserir fechados:", insertError.message);
        if (batchId) await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      result.orcamentos_fechados_inseridos = novosFechados.length;

      // Auto-split (best-effort, mesma lógica do upload)
      try {
        const { data: insertedOrcs } = await supabase
          .from("orcamentos_fechados")
          .select("id, clinica_id, procedimentos_texto, valor_total, valor_bruto, desconto_reais")
          .eq("upload_batch_id", batchId);

        if (insertedOrcs?.length) {
          const { data: procList } = await supabase
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
            await supabase.from("itens_orcamento").insert(allItems);
          }
          if (orcIds.length > 0) {
            await supabase
              .from("orcamentos_fechados")
              .update({ split_status: "auto" })
              .in("id", orcIds);
          }
        }
      } catch (err) {
        console.error("[clinicorp/sync] Erro no auto-split:", err instanceof Error ? err.message : err);
      }
    }

    // Inserir orçamentos abertos
    if (novosAbertos.length > 0 && batchId) {
      const rows = novosAbertos.map((a) => ({
        clinica_id,
        mes_referencia,
        paciente_nome: a.paciente_nome || "(sem nome)",
        valor_total: a.valor_total,
        status: a.status,
        data_criacao: a.data_criacao,
        upload_batch_id: batchId,
        profissional: a.profissional,
        clinicorp_treatment_id: a.clinicorp_treatment_id,
        origem: "clinicorp" as const,
      }));

      const { error: insertError } = await supabase
        .from("orcamentos_abertos")
        .insert(rows);

      if (insertError) {
        console.error("[clinicorp/sync] Erro ao inserir abertos:", insertError.message);
      } else {
        result.orcamentos_abertos_inseridos = novosAbertos.length;
      }
    }

    // Inserir pagamentos
    if (novosPagamentos.length > 0) {
      // Buscar mapa clinicorp_treatment_id → orcamento_fechado_id
      const allTreatmentIds = novosPagamentos.map((p) => p.clinicorp_treatment_id);
      const { data: orcMap } = await supabase
        .from("orcamentos_fechados")
        .select("id, clinicorp_treatment_id")
        .eq("clinica_id", clinica_id)
        .in("clinicorp_treatment_id", allTreatmentIds);

      const treatmentToOrc = new Map(
        (orcMap ?? []).map((o) => [o.clinicorp_treatment_id, o.id])
      );

      for (const pag of novosPagamentos) {
        const orcFechadoId = treatmentToOrc.get(pag.clinicorp_treatment_id);
        if (!orcFechadoId) {
          console.error(
            `[clinicorp/sync] Pagamento sem orçamento: clinicorp_treatment_id=${pag.clinicorp_treatment_id}`
          );
          continue;
        }

        // Usar RPC registrar_pagamento para criar pagamento + parcelas_cartao
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "registrar_pagamento",
          {
            p_orcamento_fechado_id: orcFechadoId,
            p_valor: pag.valor,
            p_forma: pag.forma,
            p_parcelas: pag.parcelas,
            p_data_pagamento: pag.data_pagamento,
            p_registrado_por: user.id,
          }
        );

        if (rpcError) {
          console.error(
            `[clinicorp/sync] Erro RPC pagamento (treatment=${pag.clinicorp_treatment_id}):`,
            rpcError.message
          );
          continue;
        }

        // Atualizar bandeira e clinicorp_payment_id no pagamento criado
        const rpcData = rpcResult as Record<string, unknown> | null;
        const pagRecord = rpcData?.pagamento as Record<string, unknown> | undefined;
        const pagId = pagRecord?.id as string | undefined;

        if (pagId) {
          await supabase
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

    // Atualizar batch como concluído
    if (batchId) {
      await supabase
        .from("upload_batches")
        .update({
          status: "concluido",
          total_registros:
            result.orcamentos_fechados_inseridos + result.orcamentos_abertos_inseridos,
        })
        .eq("id", batchId);
    }

    // Disparar n8n para recalcular resumo mensal
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (webhookUrl && webhookSecret) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": webhookSecret,
          },
          body: JSON.stringify({
            clinica_id,
            mes_referencia,
            action: "recalcular",
          }),
        });
      } catch (err) {
        console.error("[clinicorp/sync] Erro ao enviar webhook n8n:", err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({ dry_run: false, result }, { status: 201 });
  } catch (err) {
    console.error("[clinicorp/sync] Erro interno:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
