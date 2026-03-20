"use client";

import { useCallback, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Text as RechartsText,
} from "recharts";
import type { ChartDataAdminPoint } from "@/types/dashboard.types";
import { formatCurrency } from "@/lib/utils/formatting";
import { CHART_MARGIN_BOTTOM, CHART_MARGIN_LEFT, CHART_MARGIN_RIGHT, CHART_X_LABEL_AREA_HEIGHT, CHART_X_PADDING_LEFT, CHART_X_PADDING_RIGHT_BAR, CHART_Y_AXIS_WIDTH } from "./chartConstants";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Deslocamento em px dos rótulos do eixo X para a direita (aumente para mais direita, use negativo para esquerda). */
const X_AXIS_LABEL_OFFSET_PX = 90;

/** Tick customizado: rótulo no centro entre as duas barras do mês + deslocamento. */
function XAxisTickCentered(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  viewBox?: { width?: number };
  visibleTicksCount?: number;
  tickFormatter?: (value: unknown, index: number) => string;
  index?: number;
  className?: string;
  fill?: string;
}) {
  const {
    x = 0,
    y = 0,
    payload,
    viewBox,
    visibleTicksCount = 1,
    tickFormatter,
    index = 0,
    className,
    fill = "#6B6D70",
  } = props;
  const contentWidth =
    viewBox?.width != null ? viewBox.width - CHART_Y_AXIS_WIDTH : 0;
  const bandWidth =
    contentWidth > 0 && visibleTicksCount > 0
      ? contentWidth / visibleTicksCount
      : 0;
  const baseX = bandWidth > 0 ? x + bandWidth / 2 : x;
  const centerX = baseX + X_AXIS_LABEL_OFFSET_PX;
  const value = payload?.value;
  const formatted =
    typeof tickFormatter === "function" ? tickFormatter(value, index) : value;
  return (
    <RechartsText
      x={centerX}
      y={y + 6}
      textAnchor="middle"
      fill={fill}
      fontSize={11}
      className={className}
    >
      {formatted}
    </RechartsText>
  );
}

const MIN_BAR_HEIGHT_PX = 14; // altura mínima para qualquer barra quando valor > 0 (evita sumir ao lado da outra)

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

/** Corta meses vazios à esquerda; mantém a partir do primeiro mês com dado. */
function trimEmptyMonths(data: ChartDataAdminPoint[]): ChartDataAdminPoint[] {
  const firstWithData = data.findIndex(
    (d) => (d.faturamentoBruto ?? 0) > 0 || (d.totalRecebidoMes ?? 0) > 0
  );
  if (firstWithData === -1) return data;
  return data.slice(firstWithData);
}

/** Tooltip customizado: usa a posição real do mouse para determinar o mês (evita tooltip do mês errado). */
function CustomTooltipFaturamento(props: {
  active?: boolean;
  payload?: Array<{ payload?: ChartDataAdminPoint & { mesLabel?: string } }>;
  chartData?: Array<ChartDataAdminPoint & { mesLabel?: string }>;
  cursorX?: number | null;
  chartRect?: { left: number; width: number } | null;
}) {
  const { active, payload, chartData, cursorX, chartRect } = props;
  if (!active || !chartData?.length) return null;

  let row: (ChartDataAdminPoint & { mesLabel?: string }) | undefined;

  if (chartRect && chartRect.width > 0 && typeof cursorX === "number") {
    const n = chartData.length;
    const bandWidth = chartRect.width / n;
    const xInContent = cursorX - chartRect.left;
    const index = Math.min(n - 1, Math.max(0, Math.floor(xInContent / bandWidth)));
    row = chartData[index];
  }
  if (!row && payload?.length) row = payload[0]?.payload as (ChartDataAdminPoint & { mesLabel?: string }) | undefined;
  if (!row) row = chartData[0];

  const mesLabel = row.mesLabel ?? formatMonth(row.mesReferencia);
  const fat = Number(row.faturamentoBruto ?? 0);
  const rec = Number(row.totalRecebidoMes ?? 0);
  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 shadow-md"
      style={{ fontSize: 12 }}
    >
      <div className="font-semibold leading-tight">{mesLabel}</div>
      <div className="leading-tight" style={{ color: "#00109E" }}>Fatur.: {formatCurrency(fat)}</div>
      <div className="leading-tight" style={{ color: "#35BFAD" }}>Total: {formatCurrency(rec)}</div>
    </div>
  );
}

/** Barra: não desenha quando valor é zero; quando > 0 usa altura mínima. */
type BarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  fill?: string;
  radius?: number[];
};
function BarShapeWithMinHeight(props: BarShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0, fill = "#333", radius = [4, 4, 0, 0] } = props;
  const numVal = typeof value === "number" ? value : Number(value ?? 0);
  if (numVal <= 0) return null;
  const h = Math.max(height, MIN_BAR_HEIGHT_PX);
  const y2 = height < MIN_BAR_HEIGHT_PX ? y + height - h : y;
  return (
    <rect x={x} y={y2} width={width} height={h} fill={fill} rx={radius[0]} ry={radius[1]} />
  );
}


type ChartFaturamentoRecebimentoProps = {
  data: ChartDataAdminPoint[];
  className?: string;
};

export function ChartFaturamentoRecebimento({ data, className = "" }: ChartFaturamentoRecebimentoProps) {
  const trimmed = trimEmptyMonths(data);
  const chartData = trimmed.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorRect, setCursorRect] = useState<{
    x: number;
    left: number;
    width: number;
  } | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const svg = el.querySelector("svg.recharts-surface");
    const rect = svg
      ? (svg as SVGElement).getBoundingClientRect()
      : el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    if (width <= 0) return;
    const marginLeft = CHART_MARGIN_LEFT;
    const yAxisWidth = CHART_Y_AXIS_WIDTH;
    const marginRight = CHART_MARGIN_RIGHT;
    const contentLeft = marginLeft + yAxisWidth;
    const contentWidth = Math.max(1, width - contentLeft - marginRight);
    setCursorRect({ x, left: contentLeft, width: contentWidth });
  }, []);
  const onMouseLeave = useCallback(() => setCursorRect(null), []);

  const n = chartData.length;
  const bandWidth = cursorRect && cursorRect.width > 0 ? cursorRect.width / n : 0;
  const xInContent = cursorRect ? cursorRect.x - cursorRect.left : 0;
  const activeIndex =
    n > 0 ? Math.min(n - 1, Math.max(0, Math.floor(xInContent / bandWidth))) : 0;
  const bandLeftPx = cursorRect && bandWidth > 0 ? cursorRect.left + activeIndex * bandWidth : 0;
  const bandWidthPx = bandWidth;

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md w-full min-w-0 ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        Faturamento bruto vs total recebido
      </h3>
      <div
        ref={containerRef}
        className="relative h-72 w-full min-w-0"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ width: "100%" }}
      >
        {cursorRect != null && bandWidthPx > 0 && (
          <div
            className="pointer-events-none absolute rounded"
            style={{
              left: bandLeftPx + bandWidthPx * 0.11,
              width: bandWidthPx * 0.80,
              top: 0,
              bottom: CHART_X_LABEL_AREA_HEIGHT,
              backgroundColor: "rgba(229, 231, 235, 0.5)",
            }}
            aria-hidden
          />
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: CHART_MARGIN_RIGHT, left: CHART_MARGIN_LEFT, bottom: CHART_MARGIN_BOTTOM }}
            barCategoryGap={28}
            barGap={6}
            style={{ width: "100%" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
            <XAxis
              dataKey="mesLabel"
              tick={<XAxisTickCentered />}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
              scale="band"
              padding={{ left: CHART_X_PADDING_LEFT, right: CHART_X_PADDING_RIGHT_BAR }}
              interval={0}
            />
            <YAxis
              width={CHART_Y_AXIS_WIDTH}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
            />
            <Tooltip
              content={(p) => (
                <CustomTooltipFaturamento
                  {...p}
                  chartData={chartData}
                  cursorX={cursorRect?.x ?? null}
                  chartRect={cursorRect ? { left: cursorRect.left, width: cursorRect.width } : null}
                />
              )}
              cursor={false}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="faturamentoBruto"
              name="Faturamento bruto"
              fill="#00109E"
              radius={[4, 4, 0, 0]}
              shape={(p: unknown) => <BarShapeWithMinHeight {...(p as BarShapeProps)} />}
            />
            <Bar
              dataKey="totalRecebidoMes"
              name="Total recebido"
              fill="#35BFAD"
              radius={[4, 4, 0, 0]}
              shape={(p: unknown) => <BarShapeWithMinHeight {...(p as BarShapeProps)} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
