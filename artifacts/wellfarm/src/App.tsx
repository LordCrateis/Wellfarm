import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { PublicHome, Roles, FarmerHome, ScanJourney, FarmerHistory, ReferralDetail, OfficialsOverview, OfficialIntelligence, OfficialDistrict, OfficialCases, OfficialCaseDetail, OfficialReferrals, OfficialReport, LabDesk, LabCase, Transparency, GuidedDemo } from "@/pages/Pages";
import type { LocaleKey } from "@/i18n/locales";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const [locale, setLocale] = useState<LocaleKey>(() => (localStorage.getItem("wellfarm-locale") as LocaleKey) || "en");
  const changeLocale = (next: LocaleKey) => { setLocale(next); localStorage.setItem("wellfarm-locale", next); };
  const props = { locale, setLocale: changeLocale };
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={() => <PublicHome {...props} />} />
    <Route path="/roles" component={() => <Roles {...props} />} />
    <Route path="/farmer" component={() => <FarmerHome {...props} />} />
    <Route path="/farmer/scan" component={() => <ScanJourney {...props} />} />
    <Route path="/farmer/history" component={() => <FarmerHistory {...props} />} />
    <Route path="/farmer/history/:id" component={() => <FarmerHistory {...props} />} />
    <Route path="/farmer/referral" component={() => <ReferralDetail {...props} />} />
    <Route path="/officials" component={() => <OfficialsOverview {...props} />} />
    <Route path="/officials/intelligence" component={() => <OfficialIntelligence {...props} />} />
    <Route path="/officials/district/:id" component={() => <OfficialDistrict {...props} />} />
    <Route path="/officials/cases" component={() => <OfficialCases {...props} />} />
    <Route path="/officials/cases/:id" component={() => <OfficialCaseDetail {...props} />} />
    <Route path="/officials/referrals" component={() => <OfficialReferrals {...props} />} />
    <Route path="/officials/report" component={() => <OfficialReport {...props} />} />
    <Route path="/lab" component={() => <LabDesk {...props} />} />
    <Route path="/lab/case/:id" component={() => <LabCase {...props} />} />
    <Route path="/transparency" component={() => <Transparency {...props} />} />
    <Route path="/demo" component={() => <GuidedDemo {...props} />} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;