import { LocalizedContent } from "@/i18n/TranslationProvider";
import { AlertTriangle, CheckCircle2, Database, FlaskConical, Radio, Sparkles } from "lucide-react";
import type { Severity } from "@/data/mock";

const severityMeta = {
  low: { label: "Low", icon: CheckCircle2, cls: "bg-[hsl(112_22%_81%)] text-[hsl(153_43%_23%)] border-[hsl(112_22%_54%)]" },
  moderate: { label: "Moderate", icon: AlertTriangle, cls: "bg-[hsl(39_77%_66%/_.25)] text-[hsl(26_44%_31%)] border-[hsl(39_77%_55%)]" },
  high: { label: "High", icon: AlertTriangle, cls: "bg-[hsl(4_48%_44%/_.14)] text-[hsl(4_48%_36%)] border-[hsl(4_48%_55%)]" },
};

export function SeverityBadge({ severity, small = false }: { severity: Severity; small?: boolean }) {
  const item = severityMeta[severity];
  const Icon = item.icon;
  return <LocalizedContent>{<span data-testid={`status-severity-${severity}`} className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${small ? "rounded-md" : "rounded-lg"} ${item.cls}`}><Icon size={13} />{item.label}</span>}</LocalizedContent>;
}

type ProvenanceKind = "live" | "model" | "cache" | "sample" | "local";

export function Provenance({ kind, children }: { kind: ProvenanceKind; children?: string }) {
  const icons = { live: Radio, model: Sparkles, cache: Database, sample: FlaskConical, local: CheckCircle2 };
  const labels = { live: "Live weather", model: "Vision model", cache: "Cached result", sample: "Sample data", local: "Local record" };
  const Icon = icons[kind];
  return <LocalizedContent>{<span data-testid={`badge-provenance-${kind}`} className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]"><Icon size={12} />{children ?? labels[kind]}</span>}</LocalizedContent>;
}

export function SectionLabel({ children, eyebrow }: { children: string; eyebrow?: string }) {
  return <LocalizedContent>{<div className="mb-4"><div className="mb-1 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{eyebrow ?? "Wellfarm intelligence"}</div><h2 className="text-xl font-bold tracking-[-.02em] text-[hsl(var(--foreground))]">{children}</h2></div>}</LocalizedContent>;
}

export function MiniBar({ values, color = "hsl(var(--primary))" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  return <LocalizedContent>{<div className="flex h-16 items-end gap-1.5" aria-label="trend chart">{values.map((value, index) => <div key={index} className="flex-1 rounded-t-sm opacity-90" style={{ height: `${Math.max(12, value / max * 100)}%`, backgroundColor: color }} />)}</div>}</LocalizedContent>;
}
