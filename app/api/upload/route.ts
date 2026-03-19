import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { matchProcedimentoPorNome } from "@/lib/utils/match-procedimento";
import { splitOrcamento, type ProcedimentoRef, type OrcamentoParaSplit } from "@/lib/utils/split-orcamento";
import { isMesFechado } from "@/app/admin/configuracoes/fechamento/actions";
import type {
  TransformedOrcamentoFechado,
  TransformedOrcamentoAberto,
  TransformedTratamento,
} from "@/types/upload.types";

type Body = {
  clinica_id: string;
  mes_referencia: string;
  tipo: "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados";
  registros: TransformedOrcamentoFechado[] | TransformedOrcamentoAberto[] | TransformedTratamento[];
  arquivo_nome?: string;
  substituir?: boolean;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
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

    const body = (await request.json()) as Body;
    const { clinica_id, mes_referencia, tipo, registros, arquivo_nome, substituir } = body;

    if (!clinica_id || !mes_referencia || !tipo || !Array.isArray(registros)) {
      return NextResponse.json(
        { error: "clinica_id, mes_referencia, tipo e registros são obrigatórios" },
        { status: 400 }
      );
    }

    // Bloquear upload para meses fechados
    const mesFechado = await isMesFechado(mes_referencia.slice(0, 7));
    if (mesFechado) {
      return NextResponse.json(
        { error: `O mês ${mes_referencia.slice(0, 7)} está fechado. Reabra em Configurações > Fechamento de Mês antes de fazer upload.` },
        { status: 400 }
      );
    }

    if (substituir) {
      const { data: existing } = await supabase
        .from("upload_batches")
        .select("id")
        .eq("clinica_id", clinica_id)
        .eq("mes_referencia", mes_referencia)
        .eq("tipo", tipo)
        .maybeSingle();

      if (existing?.id) {
        if (tipo === "orcamentos_fechados") {
          await supabase.from("orcamentos_fechados").delete().eq("upload_batch_id", existing.id);
        } else if (tipo === "orcamentos_abertos") {
          await supabase.from("orcamentos_abertos").delete().eq("upload_batch_id", existing.id);
        } else {
          await supabase.from("tratamentos_executados").delete().eq("upload_batch_id", existing.id);
        }
        await supabase.from("upload_batches").delete().eq("id", existing.id);
      }
    }

    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        clinica_id,
        mes_referencia,
        tipo,
        arquivo_nome: arquivo_nome ?? null,
        status: "processando",
        total_registros: registros.length,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: batchError?.message ?? "Erro ao criar batch" }, { status: 500 });
    }

    const batchId = batch.id;

    if (tipo === "orcamentos_fechados") {
      const rows = (registros as TransformedOrcamentoFechado[]).map((r) => {
        const base: Record<string, unknown> = {
          clinica_id,
          mes_referencia,
          paciente_nome: r.paciente_nome || "(sem nome)",
          valor_total: r.valor_total,
          valor_pago: 0,
          data_fechamento: r.data_fechamento,
          upload_batch_id: batchId,
        };
        const extended = {
          profissional: r.profissional ?? null,
          paciente_telefone: r.paciente_telefone ?? null,
          procedimentos_texto: r.procedimentos_texto ?? null,
          valor_bruto: r.valor_bruto ?? null,
          desconto_percentual: r.desconto_percentual ?? null,
          desconto_reais: r.desconto_reais ?? null,
          observacoes: r.observacoes ?? null,
          tem_indicacao: r.tem_indicacao ?? false,
        };
        return { ...base, ...extended };
      });
      const { error: insertError } = await supabase.from("orcamentos_fechados").insert(rows);
      if (insertError) {
        if (insertError.message?.includes("desconto_percentual") || insertError.message?.includes("schema cache")) {
          const rowsBase = (registros as TransformedOrcamentoFechado[]).map((r) => ({
            clinica_id,
            mes_referencia,
            paciente_nome: r.paciente_nome || "(sem nome)",
            valor_total: r.valor_total,
            valor_pago: 0,
            data_fechamento: r.data_fechamento,
            upload_batch_id: batchId,
          }));
          const { error: insertBaseError } = await supabase.from("orcamentos_fechados").insert(rowsBase);
          if (insertBaseError) {
            await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
            return NextResponse.json({ error: insertBaseError.message }, { status: 500 });
          }
        } else {
          await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }

      // Auto-split: desmembrar orcamentos em itens individuais (best-effort)
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
            const result = splitOrcamento(orc, procs);
            orcIds.push(orc.id);
            for (const item of result.items) {
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
      } catch {
        // Auto-split falhou — nao bloqueia upload, admin faz split manual no Fechamento
      }
    } else if (tipo === "orcamentos_abertos") {
      const rowsFull = (registros as TransformedOrcamentoAberto[]).map((r) => ({
        clinica_id,
        mes_referencia,
        paciente_nome: r.paciente_nome || "(sem nome)",
        valor_total: r.valor_total,
        status: r.status ?? "aberto",
        data_criacao: r.data_criacao,
        upload_batch_id: batchId,
        profissional: r.profissional ?? null,
      }));
      const { error: insertError } = await supabase.from("orcamentos_abertos").insert(rowsFull);
      if (insertError && (insertError.message?.includes("profissional") || insertError.message?.includes("schema cache"))) {
        const rowsBase = (registros as TransformedOrcamentoAberto[]).map((r) => ({
          clinica_id,
          mes_referencia,
          paciente_nome: r.paciente_nome || "(sem nome)",
          valor_total: r.valor_total,
          status: r.status ?? "aberto",
          data_criacao: r.data_criacao,
          upload_batch_id: batchId,
        }));
        const { error: insertBaseError } = await supabase.from("orcamentos_abertos").insert(rowsBase);
        if (insertBaseError) {
          await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
          return NextResponse.json({ error: insertBaseError.message }, { status: 500 });
        }
      } else if (insertError) {
        await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    } else {
      const { data: procedimentosList } = await supabase
        .from("procedimentos")
        .select("id, nome, codigo_clinicorp")
        .eq("ativo", true);
      const procedimentos = (procedimentosList ?? []) as { id: string; nome: string; codigo_clinicorp?: string | null }[];

      const rowsFull = (registros as TransformedTratamento[]).map((r) => {
        const nomePlanilha = r.procedimento_nome || "(vazio)";
        const matched = matchProcedimentoPorNome(nomePlanilha, procedimentos);
        return {
          clinica_id,
          mes_referencia,
          paciente_nome: r.paciente_nome || "(sem nome)",
          procedimento_nome: nomePlanilha,
          procedimento_id: matched?.id ?? null,
          quantidade: r.quantidade ?? 1,
          data_execucao: r.data_execucao,
          upload_batch_id: batchId,
          profissional: r.profissional ?? null,
          regiao: r.regiao ?? null,
          valor: r.valor ?? 0,
        };
      });
      const { error: insertError } = await supabase.from("tratamentos_executados").insert(rowsFull);
      if (insertError && (insertError.message?.includes("profissional") || insertError.message?.includes("regiao") || insertError.message?.includes("valor") || insertError.message?.includes("schema cache"))) {
        const rowsBase = (registros as TransformedTratamento[]).map((r) => {
          const nomePlanilha = r.procedimento_nome || "(vazio)";
          const matched = matchProcedimentoPorNome(nomePlanilha, procedimentos);
          return {
            clinica_id,
            mes_referencia,
            paciente_nome: r.paciente_nome || "(sem nome)",
            procedimento_nome: nomePlanilha,
            procedimento_id: matched?.id ?? null,
            quantidade: r.quantidade ?? 1,
            data_execucao: r.data_execucao,
            upload_batch_id: batchId,
          };
        });
        const { error: insertBaseError } = await supabase.from("tratamentos_executados").insert(rowsBase);
        if (insertBaseError) {
          await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
          return NextResponse.json({ error: insertBaseError.message }, { status: 500 });
        }
      } else if (insertError) {
        await supabase.from("upload_batches").update({ status: "erro" }).eq("id", batchId);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    await supabase
      .from("upload_batches")
      .update({ status: "concluido", total_registros: registros.length })
      .eq("id", batchId);

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
          body: JSON.stringify({ upload_batch_id: batchId, tipo }),
        });
      } catch {
        // não bloqueia o fluxo
      }
    }

    return NextResponse.json({
      upload_batch_id: batchId,
      total_registros: registros.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
