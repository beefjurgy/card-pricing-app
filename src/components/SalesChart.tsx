"use client";

import { Sale } from "@/lib/types";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export function SalesChart({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) return null;

  const data = [...sales]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: s.price,
    }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-foreground)",
              fontSize: 13,
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Sale price"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--color-accent-2)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-accent-2)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
