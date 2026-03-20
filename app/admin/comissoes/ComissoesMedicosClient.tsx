"use client";
import { useState } from "react";
import { calcularComissoesMes, darBaixaComissao } from "./actions";
import type { ComissaoMedicoItem } from "@/lib/comissao-medicos-queries";
import type { MedicoRow } from "@/app/admin/configuracoes/medicos/actions";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const OPTIONS_2026 = MONTHS.map((label, i) => ({
  value: `2026-${String(i + 1).padStart(2, "0")}`,
  label: `${label}/2026`,
}));

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMes(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTHS[Number(mo) - 1]}/${y}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "pago" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status === "pago" ? "Pago" : "Pendente"}
    </span>
  );
}

export function ComissoesMedicosClient({
  comissoes: initialComissoes,
  medicos,
}: {
  comissoes: ComissaoMedicoItem[];
  medicos: MedicoRow[];
}) {
  const [comissoes, setComissoes] = useState(initialComissoes);

  const defaultMes =
    OPTIONS_2026.find((o) => o.value === new Date().toISOString().slice(0, 7))?.value ??
    OPTIONS_2026[0].value;

  // Calcular
  const [calcMes, setCalcMes] = useState(defaultMes);
  const [calculating, setCalculating] = useState(false);
  const [calcMsg, setCalcMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Filtros
  const [filtrMes, setFiltrMes] = useState("");
  const [filtrStatus, setFiltrStatus] = useState("");

  // Dar baixa
  const [modalId, setModalId] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function handleCalcular() {
    setCalculating(true);
    setCalcMsg(null);
    const result = await calcularComissoesMes(calcMes);
    setCalculating(false);
    if (result.ok) {
      setCalcMsg({
        tipo: "ok",
        texto: `${result.count} comissão(ões) gerada(s) para ${formatMes(calcMes)}.`,
      });
    } else {
      setCalcMsg({ tipo: "erro", texto: "Erro ao calcular comissões." });
    }
    setTimeout(() => setCalcMsg(null), 6000);
  }

  async function handleBaixa() {
    if (!modalId) return;
    setSaving(true);
    const result = await darBaixaComissao(modalId, observacao || undefined);
    setSaving(false);
    if (result.ok) {
      setComissoes((prev) =>
        prev.map((c) =>
          c.id === modalId
            ? { ...c, status: "pago", dataPagamento: new Date().toISOString().slice(0, 10) }
            : c
        )
      );
      setMsg({ tipo: "ok", texto: "Pagamento registrado." });
      setModalId(null);
      setObservacao("");
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao registrar." });
    }
    setTimeout(() => setMsg(null), 5000);
  }

  const filtered = comissoes.filter((c) => {
    if (filtrMes && c.mesReferencia !== filtrMes) return false;
    if (filtrStatus && c.status !== filtrStatus) return false;
    return true;
  });

  const totalPendente = filtered
    .filter((c) => c.status === "pendente")
    .reduce((s, c) => s + c.valorComissao, 0);
  const totalPago = filtered
    .filter((c) => c.status === "pago")
    .reduce((s, c) => s + c.valorComissao, 0);

  const modalItem = comissoes.find((c) => c.id === modalId);

  return (
    <div className="space-y-6">
      {/* Calcular comissões */}
      <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
        <p className="mb-3 text-sm font-medium text-white">Gerar comissões do mês</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-white/70">Mês</label>
            <select
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
              value={calcMes}
              onChange={(e) => setCalcMes(e.target.value)}
            >
              {OPTIONS_2026.map((o) => (
                <option key={o.value} value={o.value} className="bg-gray-800">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalcular}
            disabled={calculating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {calculating ? "Calculando…" : "Calcular comissões"}
          </button>
        </div>
        {calcMsg && (
          <p
            className={`mt-2 text-sm ${calcMsg.tipo === "ok" ? "text-green-300" : "text-red-300"}`}
          >
            {calcMsg.texto}
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-xs text-white/70">Total registros</p>
          <p className="mt-1 text-2xl font-bold text-white">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 backdrop-blur-sm">
          <p className="text-xs text-amber-200">A pagar</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 backdrop-blur-sm">
          <p className="text-xs text-green-200">Já pago</p>
          <p className="mt-1 text-2xl font-bold text-green-300">{formatCurrency(totalPago)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          value={filtrMes}
          onChange={(e) => setFiltrMes(e.target.value)}
        >
          <option value="" className="bg-gray-800">Todos os meses</option>
          {OPTIONS_2026.map((o) => (
            <option key={o.value} value={o.value} className="bg-gray-800">
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          value={filtrStatus}
          onChange={(e) => setFiltrStatus(e.target.value)}
        >
          <option value="" className="bg-gray-800">Todos os status</option>
          <option value="pendente" className="bg-gray-800">Pendente</option>
          <option value="pago" className="bg-gray-800">Pago</option>
        </select>
        {(filtrMes || filtrStatus) && (
          <button
            onClick={() => { setFiltrMes(""); setFiltrStatus(""); }}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/70 hover:text-white"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {msg && (
        <p className={`text-sm ${msg.tipo === "ok" ? "text-green-300" : "text-red-300"}`}>
          {msg.texto}
        </p>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/60">
            Nenhuma comissão encontrada. Use &quot;Calcular comissões&quot; para gerar o mês.
          </div>
        ) : (
          <table className="w-full text-sm text-white">
            <thead>
              <tr className="border-b border-white/20 text-left text-xs text-white/60">
                <th className="px-4 py-3">Médico</th>
                <th className="px-4 py-3">Clínica</th>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pago em</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{c.medicoNome}</td>
                  <td className="px-4 py-3 text-white/70">{c.clinicaNome}</td>
                  <td className="px-4 py-3 text-white/70">{formatMes(c.mesReferencia)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(c.valorComissao)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {c.dataPagamento
                      ? new Date(c.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "pendente" && (
                      <button
                        onClick={() => { setModalId(c.id); setObservacao(""); }}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Dar baixa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal dar baixa */}
      {modalId && modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-semibold text-white">Confirmar pagamento</h3>
            <div className="mb-4 space-y-1 text-sm text-white/80">
              <p>
                <span className="text-white/50">Médico:</span> {modalItem.medicoNome}
              </p>
              <p>
                <span className="text-white/50">Clínica:</span> {modalItem.clinicaNome}
              </p>
              <p>
                <span className="text-white/50">Mês:</span> {formatMes(modalItem.mesReferencia)}
              </p>
              <p>
                <span className="text-white/50">Valor:</span>{" "}
                <span className="font-semibold text-white">
                  {formatCurrency(modalItem.valorComissao)}
                </span>
              </p>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs text-white/70">Observação (opcional)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30"
                placeholder="Ex: Pix realizado"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBaixa}
                disabled={saving}
                className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Confirmar"}
              </button>
              <button
                onClick={() => setModalId(null)}
                className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white/70 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
