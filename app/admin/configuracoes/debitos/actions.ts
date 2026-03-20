"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";

const CriarDebitoSchema = z.object({
  clinicaId: z.string().uuid(),
  descricao: z.string().min(1),
  valorTotal: z.number().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function criarDebito(input: unknown) {
  const parsed = CriarDebitoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("debito_parceiro").insert({
    clinica_id: parsed.data.clinicaId,
    descricao: parsed.data.descricao,
    valor_total: parsed.data.valorTotal,
    data_inicio: parsed.data.dataInicio,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function registrarPagamentoDebito(debitoId: string, valor: number) {
  const { supabase } = await requireAdmin();

  const { data: debito } = await supabase
    .from("debito_parceiro")
    .select("valor_total, valor_pago")
    .eq("id", debitoId)
    .maybeSingle();

  if (!debito) return { ok: false, error: "Débito não encontrado." };

  const d = debito as Record<string, unknown>;
  const novoValorPago = Number(d.valor_pago) + valor;
  const valorTotal = Number(d.valor_total);
  const mesAtual = new Date().toISOString().slice(0, 7) + "-01";

  await supabase.from("abatimentos_debito").insert({
    debito_id: debitoId,
    mes_referencia: mesAtual,
    valor_abatido: valor,
    repasse_id: null,
  });

  const { error } = await supabase
    .from("debito_parceiro")
    .update({
      valor_pago: novoValorPago,
      status: novoValorPago >= valorTotal ? "quitado" : "ativo",
    })
    .eq("id", debitoId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, novoValorPago, quitado: novoValorPago >= valorTotal };
}
