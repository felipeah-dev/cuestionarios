"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ReporteCuestionario } from "../_actions";

const chartConfig = {
  maxima: {
    label: "Calificación Máxima",
    color: "var(--color-success)",
  },
  minima: {
    label: "Calificación Mínima",
    color: "var(--color-destructive)",
  },
} satisfies ChartConfig;

type Props = {
  data: ReporteCuestionario[];
};

export function ReportesChart({ data }: Props) {
  const chartData = data.map((item) => ({
    titulo: item.titulo.length > 22 ? item.titulo.slice(0, 22) + "…" : item.titulo,
    maxima: Number(item.maxima.toFixed(1)),
    minima: Number(item.minima.toFixed(1)),
    totalIntentos: item.totalIntentos,
  }));

  return (
    <ChartContainer config={chartConfig} className="min-h-[360px] w-full">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 16, left: 0, bottom: 70 }}
        barCategoryGap="30%"
        barGap={4}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="titulo"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
          height={75}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          width={32}
          tickCount={6}
          tickFormatter={(v: number) => String(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(label) => (
                <span className="font-semibold">{label}</span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="maxima"
          fill="var(--color-maxima)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
        />
        <Bar
          dataKey="minima"
          fill="var(--color-minima)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
        />
      </BarChart>
    </ChartContainer>
  );
}
