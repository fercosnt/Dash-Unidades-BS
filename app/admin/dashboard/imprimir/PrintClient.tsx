"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  KpisAdminV2,
  DreAdminData,
  RepasseAdminData,
  ProcedimentoRankingItem,
  TratamentoVendidoItem,
  OrcamentoFechadoItem,
  ChartDataAdminPoint,
  ChartLiquidoAdminPoint,
} from "@/types/dashboard.types";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
  return v.toFixed(1) + "%";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS_LABEL[Number(m) - 1]}/${y!.slice(2)}`;
}

type Props = {
  mes: string;
  clinicaNome: string;
  kpis: KpisAdminV2;
  dre: DreAdminData;
  repasse: RepasseAdminData;
  procedimentos: ProcedimentoRankingItem[];
  tratamentos: TratamentoVendidoItem[];
  orcamentosFechados: OrcamentoFechadoItem[];
  chartData: ChartDataAdminPoint[];
  chartLiquido: ChartLiquidoAdminPoint[];
};

export function PrintClient({
  mes,
  clinicaNome,
  kpis,
  dre,
  repasse,
  procedimentos,
  tratamentos,
  orcamentosFechados,
  chartData,
  chartLiquido,
}: Props) {
  const geradoEm = new Date().toLocaleString("pt-BR");
  const pctClinica = 100 - dre.percentualBeautySmile;

  const barData = chartData.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  const lineData = chartLiquido.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 12mm 10mm;
        }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; background-image: none !important; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, header, nav, .no-print { display: none !important; }
          body > div, main { background: white !important; background-image: none !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; overflow: visible !important; }
          .report-container { box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
          table { border-collapse: collapse; width: 100%; }
          tr { page-break-inside: avoid; }
          th, td { padding: 5px 8px; text-align: left; }
          .text-right { text-align: right; }
          .section-title { page-break-after: avoid; }
          .data-table { page-break-inside: avoid; }
          .dre-table { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .chart-section { page-break-inside: avoid; }
        }
        @media screen {
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; }
          .no-print { margin-bottom: 20px; display: flex; gap: 8px; }
          .no-print button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
          .btn-print { background: #2563eb; color: white; }
          .btn-print:hover { background: #1d4ed8; }
          .btn-close { background: #e5e7eb; color: #374151; }
          .btn-close:hover { background: #d1d5db; }
          .report-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto; }
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 6px 10px; text-align: left; }
          .text-right { text-align: right; }
        }

        .header-bar { background: #1e3a5f; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
        .header-bar h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header-bar .subtitle { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
        .header-meta { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.25); font-size: 11px; opacity: 0.8; }

        .section-title { font-size: 13px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.8px; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #1e3a5f; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .kpi-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
        .kpi-box.highlight { border-color: #1e3a5f; background: #f0f4f8; }
        .kpi-label { font-size: 8.5px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .kpi-value { font-size: 14px; font-weight: 700; color: #1a1a1a; }
        .kpi-value.accent { color: #1e3a5f; }
        .kpi-value.danger { color: #dc2626; }
        .kpi-subtitle { font-size: 8px; color: #9ca3af; margin-top: 2px; }

        .dre-table { width: 100%; }
        .dre-table td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; }
        .dre-table tr.total td { border-top: 2px solid #1e3a5f; border-bottom: 2px solid #1e3a5f; font-weight: 700; background: #f0f4f8; }
        .dre-table tr.subtotal td { font-weight: 600; background: #fafafa; }
        .dre-table tr.indent td:first-child { padding-left: 24px; }
        .dre-table .negative { color: #dc2626; }

        .data-table { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .data-table th { background: #1e3a5f; color: white; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; }
        .data-table td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:nth-child(even) td { background: #fafbfc; }

        .repasse-box { border: 2px solid #1e3a5f; border-radius: 10px; padding: 16px 20px; background: #f0f4f8; margin-top: 16px; text-align: center; }
        .repasse-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .repasse-value { font-size: 24px; font-weight: 800; color: #1e3a5f; }

        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .chart-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .chart-box h4 { font-size: 11px; font-weight: 600; color: #1e3a5f; margin: 0 0 8px 0; }

        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 600; }
        .status-pago { background: #dcfce7; color: #166534; }
        .status-parcial { background: #fef9c3; color: #854d0e; }
        .status-aberto { background: #fee2e2; color: #991b1b; }

        .footer { margin-top: 32px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
      `}</style>

      <div className="no-print">
        <button className="btn-print" onClick={() => window.print()}>Salvar como PDF / Imprimir</button>
        <button className="btn-close" onClick={() => window.close()}>Fechar</button>
      </div>

      <div className="report-container">
        {/* Header */}
        <div className="header-bar">
          <h1>Beauty Smile</h1>
          <p className="subtitle">Relatório Financeiro Mensal</p>
          <div className="header-meta">
            <span>{clinicaNome}</span>
            <span>Referência: {mes}</span>
          </div>
        </div>

        {/* KPIs — 8 cards em grid 4x2 */}
        <div className="section-title">Resumo Financeiro</div>
        <div className="kpi-grid">
          <div className="kpi-box">
            <div className="kpi-label">Faturamento Bruto</div>
            <div className="kpi-value">{fmt(kpis.faturamentoBruto)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Total Recebido</div>
            <div className="kpi-value">{fmt(kpis.totalRecebidoMes)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">A Receber</div>
            <div className="kpi-value">{fmt(kpis.totalAReceberMes)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Inadimplência</div>
            <div className="kpi-value danger">{fmt(kpis.totalInadimplente)}</div>
          </div>
          <div className="kpi-box highlight">
            <div className="kpi-label">Orçamentos Fechados</div>
            <div className="kpi-value accent">{fmt(kpis.orcamentosFechadosValor)}</div>
            <div className="kpi-subtitle">{kpis.orcamentosFechadosQtde} orçamentos</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Orçamentos Abertos</div>
            <div className="kpi-value">{fmt(kpis.orcamentosAbertosValor)}</div>
            <div className="kpi-subtitle">{kpis.orcamentosAbertosQtde} em aberto</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Procedimentos Realizados</div>
            <div className="kpi-value">{kpis.procedimentosRealizados}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Custo Total</div>
            <div className="kpi-value">{fmt(kpis.totalCustosProcedimentos + kpis.totalCustoMaoObra)}</div>
            <div className="kpi-subtitle">Proc. + Mão de obra</div>
          </div>
        </div>

        {/* DRE */}
        <div className="avoid-break">
          <div className="section-title">Demonstrativo de Resultado (DRE)</div>
          <table className="dre-table">
            <tbody>
              <tr className="subtotal"><td>Faturamento Bruto</td><td className="text-right">{fmt(dre.faturamentoBruto)}</td></tr>
              <tr className="indent"><td>(-) Custos de Procedimentos</td><td className="text-right negative">-{fmt(dre.custosProcedimentos)}</td></tr>
              <tr className="indent"><td>(-) Taxa Maquininha</td><td className="text-right negative">-{fmt(dre.taxaMaquininha)}</td></tr>
              <tr className="indent"><td>(-) Impostos NF</td><td className="text-right negative">-{fmt(dre.impostosNf)}</td></tr>
              <tr className="indent"><td>(-) Mão de Obra</td><td className="text-right negative">-{fmt(dre.custoMaoObra)}</td></tr>
              <tr className="indent"><td>(-) Comissões Médicas</td><td className="text-right negative">-{fmt(dre.comissoesMedicas)}</td></tr>
              <tr className="total"><td>= Faturamento Líquido</td><td className="text-right">{fmt(dre.valorLiquido)}</td></tr>
              <tr className="indent"><td>Beauty Smile ({pct(dre.percentualBeautySmile)})</td><td className="text-right">{fmt(dre.valorBeautySmile)}</td></tr>
              <tr className="indent"><td>Clínica Parceira ({pct(pctClinica)})</td><td className="text-right" style={{ fontWeight: 700 }}>{fmt(dre.valorClinica)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Repasse Base Caixa */}
        <div className="avoid-break">
          <div className="section-title">Repasse do Mês (Base Caixa)</div>
          <table className="dre-table">
            <tbody>
              <tr className="subtotal"><td>Total Recebido no Mês</td><td className="text-right">{fmt(repasse.totalRecebido)}</td></tr>
              <tr className="indent"><td>(-) Taxa sobre Cartão</td><td className="text-right negative">-{fmt(repasse.taxaSobreRecebido)}</td></tr>
              <tr className="indent"><td>(-) Impostos NF</td><td className="text-right negative">-{fmt(repasse.impostosNf)}</td></tr>
              <tr className="indent"><td>(-) Mão de Obra</td><td className="text-right negative">-{fmt(repasse.custoMaoObra)}</td></tr>
              <tr className="indent"><td>(-) Custos de Procedimentos</td><td className="text-right negative">-{fmt(repasse.custosProcedimentos)}</td></tr>
              <tr className="indent"><td>(-) Comissões Médicas</td><td className="text-right negative">-{fmt(repasse.comissoesMedicas)}</td></tr>
              <tr className="total"><td>= Disponível para Split</td><td className="text-right">{fmt(repasse.disponivelParaSplit)}</td></tr>
            </tbody>
          </table>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
            <div className="repasse-box">
              <div className="repasse-label">Clínica Parceira ({pct(100 - repasse.percentualBeautySmile)})</div>
              <div className="repasse-value">{fmt(repasse.valorRepassar)}</div>
            </div>
            <div className="repasse-box" style={{ borderColor: "#BB965B", background: "#fdf8f0" }}>
              <div className="repasse-label">Beauty Smile ({pct(repasse.percentualBeautySmile)})</div>
              <div className="repasse-value" style={{ color: "#BB965B" }}>{fmt(repasse.valorBeautySmileRetém)}</div>
            </div>
          </div>
        </div>

        {/* Gráficos históricos */}
        <div className="page-break" />
        <div className="section-title">Evolução Histórica</div>
        <div className="charts-grid">
          <div className="chart-box chart-section">
            <h4>Faturamento Bruto vs Total Recebido (12 meses)</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 8, fill: "#6B6D70" }} tickLine={false} axisLine={{ stroke: "#E8E9E8" }} interval={1} />
                  <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} tick={{ fontSize: 8, fill: "#6B6D70" }} tickLine={false} axisLine={{ stroke: "#E8E9E8" }} />
                  <Tooltip formatter={(value: number, name: string) => [fmt(value), name]} contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="faturamentoBruto" name="Faturamento" fill="#00109E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalRecebidoMes" name="Recebido" fill="#35BFAD" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-box chart-section">
            <h4>Evolução do Valor Líquido (12 meses)</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 8, fill: "#6B6D70" }} tickLine={false} axisLine={{ stroke: "#E8E9E8" }} interval={1} />
                  <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} tick={{ fontSize: 8, fill: "#6B6D70" }} tickLine={false} axisLine={{ stroke: "#E8E9E8" }} />
                  <Tooltip formatter={(value: number) => [fmt(value), "Valor líquido"]} contentStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="valorLiquido" name="Valor líquido" stroke="#BB965B" strokeWidth={2} dot={{ fill: "#BB965B", r: 2.5, strokeWidth: 1.5, stroke: "#fff" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Orçamentos Fechados */}
        {orcamentosFechados.length > 0 && (
          <>
            <div className="section-title">Orçamentos Fechados</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Clínica</th>
                  <th className="text-right">Valor Total</th>
                  <th className="text-right">Pago</th>
                  <th className="text-right">Em Aberto</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Fechamento</th>
                </tr>
              </thead>
              <tbody>
                {orcamentosFechados.slice(0, 20).map((o) => (
                  <tr key={o.id}>
                    <td>{o.pacienteNome}</td>
                    <td>{o.clinicaNome}</td>
                    <td className="text-right">{fmt(o.valorTotal)}</td>
                    <td className="text-right" style={{ color: "#166534" }}>{fmt(o.valorPago)}</td>
                    <td className="text-right" style={{ color: o.valorEmAberto > 0 ? "#dc2626" : undefined }}>{fmt(o.valorEmAberto)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`status-badge ${
                        o.status === "pago" ? "status-pago" : o.status === "parcial" ? "status-parcial" : "status-aberto"
                      }`}>
                        {o.status === "pago" ? "Pago" : o.status === "parcial" ? "Parcial" : "Em aberto"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>{formatDate(o.dataFechamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Procedimentos Realizados */}
        {procedimentos.length > 0 && (
          <div className="avoid-break">
            <div className="section-title">Procedimentos Realizados</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Procedimento</th>
                  <th className="text-right">Qtde</th>
                  <th className="text-right">Custo Unit.</th>
                  <th className="text-right">Custo Total</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {procedimentos.slice(0, 15).map((p) => (
                  <tr key={p.procedimentoNome}>
                    <td>{p.procedimentoNome}</td>
                    <td className="text-right">{p.quantidade}</td>
                    <td className="text-right">{fmt(p.custoUnitario)}</td>
                    <td className="text-right">{fmt(p.custoTotal)}</td>
                    <td className="text-right">{pct(p.percentualQtde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tratamentos Vendidos */}
        {tratamentos.length > 0 && (
          <div className="avoid-break">
            <div className="section-title">Tratamentos Vendidos</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tratamento</th>
                  <th className="text-right">Qtde</th>
                  <th className="text-right">Valor Total</th>
                  <th className="text-right">Ticket Médio</th>
                  <th className="text-right">% Fat.</th>
                </tr>
              </thead>
              <tbody>
                {tratamentos.slice(0, 15).map((t) => (
                  <tr key={t.tratamentoNome}>
                    <td>{t.tratamentoNome}</td>
                    <td className="text-right">{t.quantidade}</td>
                    <td className="text-right">{fmt(t.valorTotal)}</td>
                    <td className="text-right">{t.quantidade > 0 ? fmt(t.valorTotal / t.quantidade) : "—"}</td>
                    <td className="text-right">{pct(t.percentualFaturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Relatório gerado em {geradoEm} · Beauty Smile Labs · Documento confidencial</p>
        </div>
      </div>
    </>
  );
}
