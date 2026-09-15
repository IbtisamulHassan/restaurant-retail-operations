"use client";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#166534", "#d97706", "#0ea5e9", "#8b5cf6", "#e11d48", "#0d9488", "#f59e0b", "#64748b"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e7e0d2",
  background: "#fffdf8",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(28,43,35,0.12)",
};

export function BarChartCard({
  data,
  xKey,
  yKey,
  color = "#166534",
  height = 240,
  yFmt,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yFmt?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede6d8" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={yFmt} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5efe3" }} />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaChartCard({
  data,
  xKey,
  yKey,
  color = "#166534",
  height = 240,
  yFmt,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yFmt?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede6d8" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={yFmt} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} fill={`url(#g-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChartCard({
  data,
  height = 240,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MultiBarChartCard({
  data,
  xKey,
  yKeys,
  height = 280,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede6d8" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5efe3" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {yKeys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
