import { Link } from "wouter";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" data-testid="link-brand" className={`inline-flex items-center gap-2 font-bold tracking-[-.03em] ${inverse ? "text-[hsl(var(--sidebar-foreground))]" : "text-[hsl(var(--primary))]"}`}>
    <img src="/favicon.svg?v=wellfarm-w1" alt="" aria-hidden="true" className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-white/15" />
    <span className="text-xl">Wellfarm<span className="text-[hsl(var(--accent-foreground))]">.</span></span>
  </Link>;
}
