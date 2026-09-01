import { Bell, ChevronDown, Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Brand } from "./Brand";
import { languageNames, type LocaleKey, locales } from "@/i18n/locales";

type Workspace = "farmer" | "insights";

export function LanguageSelect({ locale, setLocale }: { locale: LocaleKey; setLocale: (value: LocaleKey) => void }) {
  return (
    <label className="relative inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
      <Globe2 size={15} />
      <select
        aria-label="Select language"
        data-testid="select-language"
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleKey)}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-[hsl(var(--foreground))] outline-none"
      >
        {Object.entries(languageNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-0" />
    </label>
  );
}

export function PublicNav({ locale, setLocale }: { locale: LocaleKey; setLocale: (value: LocaleKey) => void }) {
  const t = locales[locale];
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/_.94)] backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav className={`${open ? "absolute left-4 right-4 top-[68px] flex" : "hidden"} flex-col gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-md md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <a href="#how" className="rounded-md px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="link-how">{t.nav.how}</a>
          <Link href="/farmer" className="rounded-md px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="link-farmers">{t.nav.farmers}</Link>
          <Link href="/insights" className="rounded-md px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="link-insights">{t.nav.insights}</Link>
          <Link href="/transparency" className="rounded-md px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="link-transparency">{t.nav.transparency}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSelect locale={locale} setLocale={setLocale} />
          <Link href="/workspaces" data-testid="link-open-wellfarm" className="hidden rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 sm:inline-flex">{t.actions.open}</Link>
          <button aria-label="Toggle menu" data-testid="button-toggle-menu" className="rounded-md p-2 md:hidden" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
    </header>
  );
}

const insightItems = [
  { href: "/insights", label: "Overview", icon: "OV" },
  { href: "/insights/intelligence", label: "Patterns", icon: "PT" },
];

export function AppShell({ children, role, locale, setLocale }: { children: ReactNode; role: Workspace; locale: LocaleKey; setLocale: (value: LocaleKey) => void }) {
  const [location] = useLocation();
  const [mobile, setMobile] = useState(false);
  const farmerItems = [
    { href: "/farmer", label: "Field home", icon: "FH" },
    { href: "/farmer/scan", label: "Scan a crop", icon: "SC" },
    { href: "/farmer/history", label: "Scan history", icon: "HI" },
  ];
  const isFarmer = role === "farmer";
  const items = isFarmer ? farmerItems : insightItems;

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className={`${mobile ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-[272px] bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] transition-transform lg:translate-x-0`}>
        <div className="flex items-center justify-between"><Brand inverse /><button className="rounded p-2 lg:hidden" onClick={() => setMobile(false)} data-testid="button-close-sidebar"><X size={18} /></button></div>
        <div className="mt-9 border-b border-[hsl(var(--sidebar-border))] pb-5">
          <div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-primary))]">Current workspace</div>
          <div className="mt-2 text-lg font-bold">{isFarmer ? "Farmer fieldbook" : "Regional insights"}</div>
          <div className="mt-1 text-xs text-[hsl(var(--sidebar-foreground)/_.62)]">{isFarmer ? "Personal crop health" : "Privacy-reduced sample patterns"}</div>
        </div>
        <nav className="mt-6 space-y-1">
          {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobile(false)} data-testid={`link-sidebar-${item.label.toLowerCase().replaceAll(" ", "-")}`} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${location === item.href ? "bg-[hsl(var(--sidebar-primary))] font-bold text-[hsl(var(--sidebar-primary-foreground))]" : "text-[hsl(var(--sidebar-foreground)/_.72)] hover:bg-[hsl(var(--sidebar-accent))]"}`}><span className="grid h-6 w-6 place-items-center rounded border border-current/30 font-mono text-[9px]">{item.icon}</span>{item.label}</Link>)}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 border-t border-[hsl(var(--sidebar-border))] pt-4"><Link href="/workspaces" className="text-xs text-[hsl(var(--sidebar-primary))]" data-testid="link-switch-workspace">Switch workspace</Link></div>
      </aside>
      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/_.94)] px-5 backdrop-blur-sm lg:px-8">
          <button className="rounded-lg border border-[hsl(var(--border))] p-2 lg:hidden" onClick={() => setMobile(true)} data-testid="button-open-sidebar"><Menu size={19} /></button>
          <div className="hidden items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] md:flex"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />Wellfarm <span className="text-[hsl(var(--border))]">/</span> {isFarmer ? "Fieldbook" : "Insights"}</div>
          <div className="ml-auto flex items-center gap-4"><LanguageSelect locale={locale} setLocale={setLocale} /><Bell size={18} className="text-[hsl(var(--muted-foreground))]" /><div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--primary))]">{isFarmer ? "SP" : "WF"}</div></div>
        </header>
        <main className="mx-auto max-w-[1400px] p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
