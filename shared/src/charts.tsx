import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell } from "recharts"
import type { CSSProperties } from "react"
import { useI18n } from "./i18n"

const colors = ["#6A4CFF", "#FFC23D", "#FF6B57", "#14A37F", "#3D8BFF", "#B5468F"]

function tipStyle(): CSSProperties {
  return { background: "var(--tv-surface)", border: 0, borderRadius: 12, boxShadow: "var(--tv-floating)", color: "var(--tv-ink)", fontSize: 13 }
}

export function CountChart({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const { dir } = useI18n()
  if (items.length === 0) return null
  const data = items.map((item) => ({ name: item.label, value: item.value }))
  return (
    <section className="panel chart-panel">
      <div className="panel-head"><h2>{title}</h2></div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--tv-muted)", fontSize: 12 }} axisLine={false} tickLine={false} reversed={dir === "rtl"} />
            <YAxis tick={{ fill: "var(--tv-muted)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} orientation={dir === "rtl" ? "right" : "left"} />
            <Tooltip cursor={{ fill: "rgba(106,76,255,0.08)" }} contentStyle={tipStyle()} />
            <Bar dataKey="value" radius={[10, 10, 4, 4]}>
              {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function TrendChart({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const { dir } = useI18n()
  if (items.length === 0) return null
  const data = items.map((item) => ({ name: item.label, value: item.value }))
  return (
    <section className="panel chart-panel">
      <div className="panel-head"><h2>{title}</h2></div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tvArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6A4CFF" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6A4CFF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--tv-muted)", fontSize: 12 }} axisLine={false} tickLine={false} reversed={dir === "rtl"} />
            <YAxis tick={{ fill: "var(--tv-muted)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} orientation={dir === "rtl" ? "right" : "left"} />
            <Tooltip contentStyle={tipStyle()} />
            <Area type="monotone" dataKey="value" stroke="#6A4CFF" strokeWidth={2.4} fill="url(#tvArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
