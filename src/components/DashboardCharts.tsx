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
import { brl } from "@/lib/format";

export type DashboardChartRow = {
  month: string;
  Receita: number;
  Despesas: number;
  Operacionais: number;
  Concessionária: number;
  Lucro: number;
};

export function DashboardPerformanceChart({ data }: { data: DashboardChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={8} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 500 }}
          dy={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 500 }}
          tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v))}
        />
        <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.1 }} content={<ChartTooltip />} />
        <Bar dataKey="Receita" fill="#2F6F62" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Despesas" fill="#D64545" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Lucro" fill="#2E5C8A" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardSparkline({
  data,
  color,
}: {
  data: { value: number }[];
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card rounded-xl px-3 py-2 shadow-2xl">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-6 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: item.fill }} />
            {item.dataKey}
          </span>
          <span className="num font-semibold text-foreground">{brl(Number(item.value))}</span>
        </div>
      ))}
    </div>
  );
}
