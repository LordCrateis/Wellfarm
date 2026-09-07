import { useEffect, useState } from "react";
import { Bell, CheckCheck, Leaf, Settings, UserRound, ArrowRight, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { LocalizedContent, useTranslation } from "@/i18n/TranslationProvider";
import { profileInitials, useAccount } from "@/services/profile";
import { listScanRecords } from "@/services/adapters";

export function AccountControls() {
  const { profile, readIds, markRead } = useAccount();
  const { locale, t } = useTranslation();
  const [path, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [readError, setReadError] = useState(false);
  const client = useQueryClient();
  const activity = useQuery({ queryKey: ["workspace-scans"], queryFn: listScanRecords, enabled: profile.notifications, staleTime: 30_000, refetchInterval: 60_000, retry: 1 });
  useEffect(() => { setOpen(false); setMenuOpen(false); }, [path]);
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ["workspace-scans"] }); };
    window.addEventListener("wellfarm:scans-changed", refresh);
    return () => window.removeEventListener("wellfarm:scans-changed", refresh);
  }, [client]);
  const scans = [...(activity.data ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = scans.filter(scan => !readIds.includes(scan.id));
  return <LocalizedContent>
    <Popover open={open} onOpenChange={next => { setOpen(next); setReadError(false); if (next && profile.notifications) void activity.refetch(); }}>
      <PopoverTrigger asChild>
        <button type="button" data-testid="button-notifications" aria-label={t("Notifications")} className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] focus-visible:outline focus-visible:outline-2">
          <Bell size={20} aria-hidden="true" />
          {profile.notifications && unread.length > 0 && <span aria-hidden="true" className="absolute right-0 top-0 min-w-4 rounded-full bg-[hsl(var(--primary))] px-1 text-[10px] font-bold text-[hsl(var(--primary-foreground))]">{unread.length > 99 ? "99+" : unread.length}</span>}
          <span className="sr-only">{profile.notifications ? `${unread.length} unread` : "Notifications paused"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} collisionPadding={12} className="w-[min(380px,calc(100vw-24px))] rounded-xl p-0 shadow-xl" aria-label={t("Notifications")}>
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div><h2 className="font-bold">Notifications</h2><p className="mt-1 text-xs text-muted-foreground">Saved-scan activity in this workspace.</p></div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-muted"><X size={16} /></button>
        </div>
        {!profile.notifications ? <div className="p-5"><h3 className="font-semibold">Notifications paused</h3><p className="mt-2 text-sm text-muted-foreground">Turn on in-app activity in your profile to see saved scans here.</p></div>
          : activity.isPending ? <p role="status" className="p-5 text-sm">Loading activity…</p>
          : activity.isError ? <div role="alert" className="p-5 text-sm"><p>Activity could not be loaded.</p><button className="mt-3 font-bold text-primary" onClick={() => void activity.refetch()}>Try again</button></div>
          : scans.length === 0 ? <div className="p-6 text-center"><Leaf className="mx-auto mb-3 text-primary" /><h3 className="font-semibold">You are all caught up</h3><p className="mt-2 text-sm text-muted-foreground">Your first saved scan will appear here.</p></div>
          : <><div className="flex items-center justify-between gap-2 px-4 py-3 text-xs"><span>{`${unread.length} unread`}</span><button disabled={!unread.length} className="inline-flex items-center gap-1 font-bold text-primary disabled:opacity-40" data-testid="button-mark-all-read" onClick={() => setReadError(!markRead(unread.map(scan => scan.id)))}><CheckCheck size={15} />Mark all read</button></div>
            <ul className="max-h-[min(360px,50dvh)] overflow-y-auto divide-y">
              {scans.slice(0, 30).map(scan => <li key={scan.id} className={!readIds.includes(scan.id) ? "bg-secondary/25" : ""}>
                <Link href={`/farmer/history/${scan.id}`} onClick={() => { markRead([scan.id]); setOpen(false); }} className="flex gap-3 px-4 py-3 hover:bg-muted" data-testid={`notification-${scan.id}`}>
                  <Leaf size={18} className="mt-1 shrink-0 text-primary" /><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-semibold">Scan saved{!readIds.includes(scan.id) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}</div><p className="mt-1 text-sm">{`${scan.crop} scan`}</p><time dateTime={scan.createdAt} className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(scan.createdAt))}</time></div>
                </Link>
              </li>)}
            </ul></>}
        {readError && <p role="alert" className="px-4 py-2 text-sm text-destructive">Your browser could not save this change.</p>}
        <div className="flex justify-between gap-3 border-t p-4 text-xs font-bold text-primary"><Link href="/farmer/history" onClick={() => setOpen(false)}>Scan history</Link><Link href="/profile" onClick={() => setOpen(false)}>Notification settings</Link></div>
      </PopoverContent>
    </Popover>
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild><button type="button" data-testid="button-profile" aria-label={t("Open profile menu")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-secondary text-sm font-bold text-primary hover:ring-2 hover:ring-primary/30 focus-visible:outline focus-visible:outline-2">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <span translate="no">{profileInitials(profile.name)}</span>}</button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} collisionPadding={12} className="w-64 max-w-[calc(100vw-24px)] rounded-xl p-2">
        <DropdownMenuLabel><span className="block truncate" translate="no">{profile.name || t("Your profile")}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Saved in this browser</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/profile")}><UserRound />Profile and preferences</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(profile.workspace === "farmer" ? "/farmer" : "/insights")}><ArrowRight />Open my workspace</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/farmer/history")}><Leaf />Scan history</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/workspaces")}><ArrowRight />Switch workspace</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/transparency")}><Settings />Privacy and transparency</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </LocalizedContent>;
}
