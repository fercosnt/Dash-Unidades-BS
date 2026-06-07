"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fetchContaCorrente } from "@/lib/saldo-parceiro-queries";
import { z } from "zod";

const RepasseSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/),
  valor: z.number().positive(),
  dataTransferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
});

/**
 * Registra um repasse em dinheiro (BS→parceiro). Modelo conta corrente única (RF-04):
 * só permitido com saldo > 0 e valor ≤ saldo. O saldo é recalculado server-side
 * (fetchContaCorrente) para a trava não depender do client.
 */
export async function registrarRepasse(input: unknown) {
  const parsed = RepasseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { clinicaId, mesReferencia, valor, dataTransferencia, observacao } = parsed.data;
  const { supabase } = await requireAdmin();

  const conta = await fetchContaCorrente(clinicaId);
  if (conta.saldo <= 0)
    return {
      ok: false,
      error: "Saldo não positivo — o parceiro ainda não pode receber em dinheiro.",
    };
  if (valor > conta.saldo + 0.001)
    return {
      ok: false,
      error: `Valor excede o saldo disponível (R$ ${conta.saldo.toFixed(2)}).`,
    };

  const { error } = await supabase.from("repasses_mensais").insert({
    clinica_id: clinicaId,
    mes_referencia: `${mesReferencia}-01`,
    valor_repasse: valor,
    tipo: "dinheiro",
    data_transferencia: dataTransferencia,
    observacao: observacao ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Desfaz um repasse (RF-05). O modelo novo não vincula abatimento a repasse, mas dados
 * legados (fluxo antigo darBaixaRepasse) podem ter abatimentos_debito.repasse_id apontando
 * p/ este repasse; como a FK é RESTRICT, removê-los antes evita erro de FK no delete. */
export async function desfazerRepasse(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("abatimentos_debito").delete().eq("repasse_id", id);
  const { error } = await supabase.from("repasses_mensais").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
