import { AlertTriangle, CheckCircle2, CircleDot, Database, FlaskConical, MapPin, Radio, ShieldCheck, Sparkles } from "lucide-react";
import type { Severity } from "@/data/mock";

const severityMeta = {
  low: { label: "Low", icon: CheckCircle2, cls: "bg-[hsl(112_22%_81%)] text-[hsl(153_43%_23%)] border-[hsl(112_22%_54%)]" },
  moderate: { label: "Moderate", icon: AlertTriangle, cls: "bg-[hsl(39_77%_66%/_.25)] text-[hsl(26_44%_31%)] border-[hsl(39_77%_55%)]" },
  high: { label: "High", icon: AlertTriangle, cls: "bg-[hsl(4_48%_44%/_.14)] text-[hsl(4_48%_36%)] border-[hsl(4_48%_55%)]" },
};
export function SeverityBadge({ severity, small = false }: { severity: Severity; small?: boolean }) {
  const item = severityMeta[severity]; const Icon = item.icon;
  return <span data-testid={`status-severity-${severity}`} className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${small ? "rounded-md" : "rounded-lg"} ${item.cls}`}><Icon size={13} />{item.label}</span>;
}
export function Provenance({ kind, children }: { kind: "demo" | "live" | "model" | "simulated" | "verified" | "cache" | "sample"; children?: string }) {
  const icons = { demo: Database, live: Radio, model: Sparkles, simulated: CircleDot, verified: ShieldCheck, cache: Database, sample: FlaskConical };
  const Icon = icons[kind];
  const colors = { demo: "text-[hsl(var(--muted-foreground))]", live: "text-[hsl(var(--primary))]", model: "text-[hsl(26_44%_35%)]", simulated: "text-[hsl(4_48%_42%)]", verified: "text-[hsl(var(--primary))]", cache: "text-[hsl(26_44%_35%)]", sample: "text-[hsl(26_44%_35%)]" };
  return <span data-testid={`badge-provenance-${kind}`} className={`inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-[11px] font-semibold ${colors[kind]}`}><Icon size={12} />{children ?? ({ demo: "Demo data", live: "Live weather", model: "Prototype model", simulated: "Simulated", verified: "Verified field result", cache: "Cached validated solution", sample: "Sample referral" }[kind])}</span>;
}
export function SectionLabel({ children, eyebrow }: { children: string; eyebrow?: string }) {
  return <div className="mb-4"><div className="mb-1 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{eyebrow ?? "Wellfarm intelligence"}</div><h2 className="text-xl font-bold tracking-[-.02em] text-[hsl(var(--foreground))]">{children}</h2></div>;
}
export function MiniBar({ values, color = "hsl(var(--primary))" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  return <div className="flex h-16 items-end gap-1.5" aria-label="trend chart">{values.map((v, i) => <div key={i} className="flex-1 rounded-t-sm opacity-90" style={{ height: `${Math.max(12, v / max * 100)}%`, backgroundColor: color }} />)}</div>;
}