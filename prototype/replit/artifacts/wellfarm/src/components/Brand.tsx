import { Leaf } from "lucide-react";
import { Link } from "wouter";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" data-testid="link-brand" className={`inline-flex items-center gap-2 font-bold tracking-[-.03em] ${inverse ? "text-[hsl(var(--sidebar-foreground))]" : "text-[hsl(var(--primary))]"}`}>
    <span className={`grid h-9 w-9 place-items-center rounded-[11px] ${inverse ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--primary))]" : "bg-[hsl(var(--primary))] text-[hsl(var(--accent))]"}`}><Leaf size={19} strokeWidth={2.5} /></span>
    <span className="text-xl">Wellfarm<span className="text-[hsl(var(--accent-foreground))]">.</span></span>
  </Link>;
}