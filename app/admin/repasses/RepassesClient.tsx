"use client";
import { useRouter } from "next/navigation";
import type { ContaCorrente } from "@/lib/saldo-parceiro-queries";
import type { LinhaExtrato } from "@/lib/utils/extrato-parceiro";

type ClinicaOption = { id: string; nome: string };

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMes(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(mo) - 1]}/${y}`;
}

const TIPO_LABEL: Record<LinhaExtrato["tipo"], string> = {
  abertura: "Abertura — Taxa de implementação",
  resultado: "Resultado do mês",
  pagamento_implementacao: "Pagamento da implementação",
  repasse: "Repasse em dinheiro",
};

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

      {!conta ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-neutral-400 shadow-md">
          Selecione uma clínica para ver a conta corrente.
        </div>
      ) : (
        <>
          {/* Saldo decomposto (RF-10) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-xs font-medium text-neutral-500">Taxa de implementação a amortizar</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">
                {conta.dividaImplementacao
                  ? formatCurrency(conta.dividaImplementacao.aAmortizar)
                  : "—"}
              </p>
              {conta.dividaImplementacao && (
                <p className="mt-1 text-xs text-neutral-400">
                  de {formatCurrency(conta.dividaImplementacao.valorTotal)} ·{" "}
                  {conta.dividaImplementacao.descricao}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-xs font-medium text-neutral-500">Resultado operacional acumulado</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  conta.operacionalAcumulado >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatCurrency(conta.operacionalAcumulado)}
              </p>
              <p className="mt-1 text-xs text-neutral-400">Σ resultados − Σ repasses</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-md ring-2 ring-primary-100">
              <p className="text-xs font-medium text-neutral-500">Saldo da conta</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  conta.saldo > 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatCurrency(conta.saldo)}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {conta.saldo > 0
                  ? "BS deve ao parceiro"
                  : "Parceiro deve à BS (implementação + float)"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-white/80">
            <span>
              Competência acumulada (referência):{" "}
              <strong className="text-white">{formatCurrency(conta.competenciaAcumulada)}</strong>
            </span>
            <span>· O parceiro recebe em dinheiro quando o saldo ficar positivo.</span>
          </div>

          {/* Extrato */}
          <div className="overflow-hidden rounded-xl bg-white shadow-md">
            <div className="border-b border-neutral-100 px-6 py-4">
              <h3 className="text-sm font-bold text-neutral-900">Extrato</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Mês</th>
                  <th className="px-4 py-3 text-left font-medium">Lançamento</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {conta.extrato.map((l, i) => (
                  <tr
                    key={`${l.mes}-${l.tipo}-${i}`}
                    className={`border-b border-neutral-50 ${
                      l.tipo === "abertura" ? "bg-neutral-50 font-medium" : "hover:bg-neutral-50"
                    }`}
                  >
                    <td className="px-4 py-3 text-neutral-600">{formatMes(l.mes)}</td>
                    <td className="px-4 py-3 text-neutral-800">{TIPO_LABEL[l.tipo]}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        l.valor >= 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(l.valor)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        l.saldo >= 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(l.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
