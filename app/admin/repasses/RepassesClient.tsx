"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrarRepasse, desfazerRepasse } from "./actions";
import { registrarPagamentoDebito } from "../configuracoes/debitos/actions";
import { ContaCorrenteView } from "@/components/conta-corrente/ContaCorrenteView";
import type { ContaCorrente } from "@/lib/saldo-parceiro-queries";

type ClinicaOption = { id: string; nome: string };

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMes(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(mo) - 1]}/${y}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ContaCorrenteClient({
  clinicas,
  clinicaSelecionada,
  conta,
}: {
  clinicas: ClinicaOption[];
  clinicaSelecionada: string;
  conta: ContaCorrente | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Form repasse
  const [repValor, setRepValor] = useState("");
  const [repData, setRepData] = useState(todayIso());
  const [repObs, setRepObs] = useState("");
  const [savingRep, setSavingRep] = useState(false);

  // Form pagamento da implementação
  const [pagValor, setPagValor] = useState("");
  const [savingPag, setSavingPag] = useState(false);

  // Desfazer
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  const mesAtual = todayIso().slice(0, 7);

  async function handleRepasse() {
    if (!conta) return;
    setSavingRep(true);
    setMsg(null);
    const res = await registrarRepasse({
      clinicaId: clinicaSelecionada,
      mesReferencia: mesAtual,
      valor: Number(repValor.replace(",", ".")),
      dataTransferencia: repData,
      observacao: repObs || undefined,
    });
    setSavingRep(false);
    if (res.ok) {
      setRepValor("");
      setRepObs("");
      setMsg({ tipo: "ok", texto: "Repasse registrado." });
      router.refresh();
    } else {
      setMsg({ tipo: "erro", texto: res.error ?? "Erro ao registrar repasse." });
    }
  }

  async function handlePagamento() {
    if (!conta?.dividaImplementacao) return;
    setSavingPag(true);
    setMsg(null);
    const res = await registrarPagamentoDebito(
      conta.dividaImplementacao.id,
      Number(pagValor.replace(",", "."))
    );
    setSavingPag(false);
    if (res.ok) {
      setPagValor("");
      setMsg({ tipo: "ok", texto: "Pagamento da implementação registrado." });
      router.refresh();
    } else {
      setMsg({ tipo: "erro", texto: res.error ?? "Erro ao registrar pagamento." });
    }
  }

  async function handleDesfazer(id: string) {
    setDesfazendo(true);
    const res = await desfazerRepasse(id);
    setDesfazendo(false);
    setConfirmId(null);
    if (res.ok) {
      setMsg({ tipo: "ok", texto: "Repasse desfeito." });
      router.refresh();
    } else {
      setMsg({ tipo: "erro", texto: res.error ?? "Erro ao desfazer." });
    }
  }

  return (
    <div className="space-y-8">
      {/* Seletor de clínica */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white">Clínica</label>
        <select
          value={clinicaSelecionada}
          onChange={(e) => router.push(`/admin/repasses?clinica=${e.target.value}`)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          {clinicas.length === 0 && <option value="">Nenhuma clínica ativa</option>}
          {clinicas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {msg && (
        <div
          className={`rounded px-3 py-2 text-sm ${
            msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {msg.texto}
        </div>
      )}

      {!conta ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-neutral-400 shadow-md">
          Selecione uma clínica para ver a conta corrente.
        </div>
      ) : (
        <>
          {/* Ações: registrar repasse + registrar pagamento da implementação */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Registrar repasse */}
            <div className="rounded-xl bg-white p-5 shadow-md">
              <h3 className="text-sm font-bold text-neutral-900">Registrar repasse em dinheiro</h3>
              {!conta.podeRepassar ? (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Saldo não positivo ({formatCurrency(conta.saldo)}). O parceiro só recebe em
                  dinheiro quando o saldo ficar positivo.
                </p>
              ) : (
                <p className="mt-1 text-xs text-neutral-400">
                  Disponível p/ repasse: {formatCurrency(conta.saldo)}
                </p>
              )}
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">Valor (R$)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={repValor}
                    onChange={(e) => setRepValor(e.target.value)}
                    disabled={!conta.podeRepassar}
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">Data da transferência</span>
                  <input
                    type="date"
                    value={repData}
                    onChange={(e) => setRepData(e.target.value)}
                    disabled={!conta.podeRepassar}
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-700">Observação (opcional)</span>
                  <input
                    type="text"
                    value={repObs}
                    onChange={(e) => setRepObs(e.target.value)}
                    disabled={!conta.podeRepassar}
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRepasse}
                  disabled={!conta.podeRepassar || savingRep || !repValor}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingRep ? "Salvando..." : "Registrar repasse"}
                </button>
              </div>
            </div>

            {/* Registrar pagamento da implementação (RF-11) */}
            <div className="rounded-xl bg-white p-5 shadow-md">
              <h3 className="text-sm font-bold text-neutral-900">
                Registrar pagamento da implementação
              </h3>
              {conta.dividaImplementacao ? (
                <>
                  <p className="mt-1 text-xs text-neutral-400">
                    Parceiro pagou a taxa em dinheiro (parceiro→BS). Entra como{" "}
                    <span className="text-green-700">+</span> no extrato. Falta amortizar:{" "}
                    {formatCurrency(conta.dividaImplementacao.aAmortizar)}.
                  </p>
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium text-neutral-700">Valor (R$)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={pagValor}
                        onChange={(e) => setPagValor(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <p className="text-xs text-neutral-400">Lançado no mês atual ({formatMes(mesAtual)}).</p>
                    <button
                      type="button"
                      onClick={handlePagamento}
                      disabled={savingPag || !pagValor}
                      className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingPag ? "Salvando..." : "Registrar pagamento"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-xs text-neutral-400">
                  Esta clínica não tem taxa de implementação ativa.
                </p>
              )}
            </div>
          </div>

          {/* Saldo decomposto + extrato (compartilhado com o parceiro) */}
          <ContaCorrenteView
            conta={conta}
            repasseAction={(refId) =>
              confirmId === refId ? (
                <span className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleDesfazer(refId)}
                    disabled={desfazendo}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    {desfazendo ? "..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-neutral-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(refId)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  Desfazer
                </button>
              )
            }
          />
        </>
      )}
    </div>
  );
}
