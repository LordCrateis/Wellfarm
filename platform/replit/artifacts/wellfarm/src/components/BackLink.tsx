import { LocalizedContent } from "@/i18n/TranslationProvider";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export function BackLink() {
  const [path] = useLocation();
  const [href, label] = path.startsWith("/farmer/history/")
    ? ["/farmer/history", "Back to scan history"]
    : path.startsWith("/farmer/")
      ? ["/farmer", "Back to field home"]
      : path.startsWith("/insights/")
        ? ["/insights", "Back to regional overview"]
        : path === "/farmer" || path === "/insights"
          ? ["/workspaces", "Back to workspaces"]
          : ["/", "Back to home"];
  return <LocalizedContent>{(
    <Link href={href} data-testid="link-back" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] focus-visible:outline focus-visible:outline-2">
      <ArrowLeft size={16} aria-hidden="true" />{label}
    </Link>
  )}</LocalizedContent>;
}
