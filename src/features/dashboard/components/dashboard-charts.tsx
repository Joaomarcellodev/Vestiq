"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/utils/currency";

interface ChartColors {
  primary: string;
  grid: string;
  axis: string;
  surface: string;
}

const FALLBACK: ChartColors = {
  primary: "#7027b8",
  grid: "#e4e0f4",
  axis: "#4c4453",
  surface: "#ffffff",
};

function readChartColors(): ChartColors {
  if (typeof document === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => {
    const raw = s.getPropertyValue(`--color-${name}`).trim();
    return raw ? `rgb(${raw})` : fallback;
  };
  return {
    primary: v("primary-container", FALLBACK.primary),
    grid: v("outline-variant", FALLBACK.grid),
    axis: v("on-surface-variant", FALLBACK.axis),
    surface: v("surface-container-lowest", FALLBACK.surface),
  };
}

/** Chart colours pulled from the live theme tokens; re-read when the theme flips. */
function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(readChartColors);
  useEffect(() => {
    const update = () => setColors(readChartColors());
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);
  return colors;
}

export function SalesTrendChart({ data }: { data: { label: string; total: number }[] }) {
  const { primary: PRIMARY, grid: GRID, axis: AXIS, surface: SURFACE } = useChartColors();
  const empty = data.every((d) => d.total === 0);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
      <h2 className="font-title-lg text-title-lg text-on-surface">Vendas — últimos 14 dias</h2>
      {empty ? (
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
          Sem vendas registradas no período.
        </p>
      ) : (
        <div className="mt-md h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) =>
                  Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(v) => [formatBRL(Number(v)), "Vendas"]}
                labelStyle={{ color: AXIS }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${GRID}`,
                  background: SURFACE,
                  color: AXIS,
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={PRIMARY}
                strokeWidth={2.5}
                fill="url(#salesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function TopProductsChart({ data }: { data: { name: string; units: number }[] }) {
  const { primary: PRIMARY, grid: GRID, axis: AXIS, surface: SURFACE } = useChartColors();
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
      <h2 className="font-title-lg text-title-lg text-on-surface">Mais vendidos</h2>
      {data.length === 0 ? (
        <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
          Nenhuma venda confirmada ainda.
        </p>
      ) : (
        <div className="mt-md h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                formatter={(v) => [`${Number(v)} un.`, "Vendidas"]}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${GRID}`,
                  background: SURFACE,
                  color: AXIS,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="units" fill={PRIMARY} radius={[0, 6, 6, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
