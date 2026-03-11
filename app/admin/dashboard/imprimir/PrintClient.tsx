"use client";
import { useEffect } from "react";
import type { KpisAdminV2, DreAdminData, RepasseAdminData, ProcedimentoRankingItem, TratamentoVendidoItem } from "@/types/dashboard.types";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
  return v.toFixed(1) + "%";
}

type Props = {
  mes: string;
  clinicaNome: string;
  kpis: KpisAdminV2;
  dre: DreAdminData;
  repasse: RepasseAdminData;
  procedimentos: ProcedimentoRankingItem[];
  tratamentos: TratamentoVendidoItem[];
};

export function PrintClient({ mes, clinicaNome, kpis, dre, repasse, procedimentos, tratamentos }: Props) {
  useEffect(() => {
    // Auto-print when the page loads
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, []);

  const geradoEm = new Date().toLocaleString("pt-BR");

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; font-family: Arial, sans-serif; font-size: 11px; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .section { margin-bottom: 20px; }
          h2 { font-size: 14px; margin: 12px 0 6px; border-bottom: 2px solid #333; padding-bottom: 4px; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #333; padding-bottom: 12px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
          .kpi-box { border: 1px solid #ddd; padding: 8px; border-radius: 4px; }
          .kpi-label { font-size: 9px; color: #666; text-transform: uppercase; }
          .kpi-value { font-size: 14px; font-weight: bold; }
          .footer { margin-top: 32px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
        }
        @media screen {
          body { font-family: Arial, sans-serif; font-size: 12px; max-width: 900px; margin: 0 auto; padding: 24px; background: #fff; }
          .no-print { margin-bottom: 16px; }
          button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; margin-right: 8px; }
          .section { margin-bottom: 24px; }
          h2 { font-size: 16px; margin: 16px 0 8px; border-bottom: 2px solid #333; padding-bottom: 6px; }
          .header { text-align: center; margin-bottom: 28px; border-bottom: 3px solid #333; padding-bottom: 16px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-box { border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
          .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
          .kpi-value { font-size: 18px; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; font-size: 11px; }
          .text-right { text-align: right; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
        }
      `}</style>

      <div className="no-print">
        <button onClick={() => window.print()}>Imprimir / Salvar PDF</button>
        <button onClick={() => window.close()} style={{ background: "#6b7280" }}>Fechar</button>
      </div>

      {/* Header */}
      <div className="header">
        <h1 style={{ fontSize: "20px", margin: "0 0 4px" }}>Beauty Smile</h1>
        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600" }}>{clinicaNome}</p>
        <p style={{ margin: 0, color: "#555" }}>Relatório Mensal — {mes}</p>
      </div>

      {/* KPIs */}
      <div className="section">
        <h2>Resumo Financeiro</h2>
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
            <div className="kpi-label">Valor Líquido</div>
            <div className="kpi-value">{fmt(kpis.valorLiquido)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Parcela Beauty Smile</div>
            <div className="kpi-value">{fmt(kpis.valorBeautySmile)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Inadimplência</div>
            <div className="kpi-value">{fmt(kpis.totalInadimplente)}</div>
          </div>
        </div>
      </div>

      {/* DRE */}
      <div className="section">
        <h2>DRE Cascata</h2>
        <table>
          <tbody>
            <tr><td>Faturamento Bruto</td><td className="text-right">{fmt(dre.faturamentoBruto)}</td></tr>
            <tr><td>(-) Custos Procedimentos</td><td className="text-right">-{fmt(dre.custosProcedimentos)}</td></tr>
            <tr><td>(-) Taxa Cartão</td><td className="text-right">-{fmt(dre.taxaMaquininha)}</td></tr>
            <tr><td>(-) Impostos NF</td><td className="text-right">-{fmt(dre.impostosNf)}</td></tr>
            <tr><td>(-) Mão de Obra</td><td className="text-right">-{fmt(dre.custoMaoObra)}</td></tr>
            <tr><td>(-) Comissões Médicas</td><td className="text-right">-{fmt(dre.comissoesMedicas)}</td></tr>
            <tr style={{ fontWeight: "bold" }}><td>= Valor Líquido</td><td className="text-right">{fmt(dre.valorLiquido)}</td></tr>
            <tr><td>&nbsp;&nbsp;→ Beauty Smile ({pct(dre.percentualBeautySmile)})</td><td className="text-right">{fmt(dre.valorBeautySmile)}</td></tr>
            <tr><td>&nbsp;&nbsp;(-) Comissão Dentista</td><td className="text-right">-{fmt(dre.comissaoDentista)}</td></tr>
            <tr style={{ fontWeight: "bold" }}><td>&nbsp;&nbsp;= Resultado Líquido BS</td><td className="text-right">{fmt(dre.resultadoLiquidoBS)}</td></tr>
            <tr><td>&nbsp;&nbsp;→ Clínica ({pct(100 - dre.percentualBeautySmile)})</td><td className="text-right">{fmt(dre.valorClinica)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Repasse */}
      <div className="section">
        <h2>Repasse do Mês (Base Caixa)</h2>
        <table>
          <tbody>
            <tr><td>Total Recebido</td><td className="text-right">{fmt(repasse.totalRecebido)}</td></tr>
            <tr><td>(-) Taxa sobre Recebido</td><td className="text-right">-{fmt(repasse.taxaSobreRecebido)}</td></tr>
            <tr><td>(-) Impostos NF</td><td className="text-right">-{fmt(repasse.impostosNf)}</td></tr>
            <tr><td>(-) Mão de Obra</td><td className="text-right">-{fmt(repasse.custoMaoObra)}</td></tr>
            <tr><td>(-) Custos Procedimentos</td><td className="text-right">-{fmt(repasse.custosProcedimentos)}</td></tr>
            <tr><td>(-) Comissões Médicas</td><td className="text-right">-{fmt(repasse.comissoesMedicas)}</td></tr>
            <tr style={{ fontWeight: "bold" }}><td>= Disponível para Split</td><td className="text-right">{fmt(repasse.disponivelParaSplit)}</td></tr>
            <tr style={{ fontWeight: "bold" }}><td>Valor a Transferir (Clínica)</td><td className="text-right">{fmt(repasse.valorRepassar)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Top Procedimentos */}
      {procedimentos.length > 0 && (
        <div className="section">
          <h2>Top Procedimentos Realizados</h2>
          <table>
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
              {procedimentos.slice(0, 10).map((p) => (
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

      {/* Top Tratamentos Vendidos */}
      {tratamentos.length > 0 && (
        <div className="section">
          <h2>Top Tratamentos Vendidos</h2>
          <table>
            <thead>
              <tr>
                <th>Tratamento</th>
                <th className="text-right">Qtde</th>
                <th className="text-right">Valor Total</th>
                <th className="text-right">Ticket Médio</th>
                <th className="text-right">% Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {tratamentos.slice(0, 10).map((t) => (
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
    </>
  );
}
