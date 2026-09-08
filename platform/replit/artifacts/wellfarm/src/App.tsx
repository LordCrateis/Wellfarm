import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import {
  PublicHome,
  Roles,
  FarmerHome,
  ScanJourney,
  FarmerHistory,
  RegionalOverview,
  RegionalIntelligence,
  RegionalDistrict,
  Transparency,
} from "@/pages/Pages";
import { languageNames, type LocaleKey } from "@/i18n/locales";
import { TranslationProvider } from "@/i18n/TranslationProvider";
import NotFound from "@/pages/not-found";
import { AccountProvider } from "@/services/profile";
import { ProfilePage } from "@/pages/Profile";
import { Login, AccountGate } from "@/pages/Login";
import { AdminPage, MessagesPage } from "@/pages/Admin";
import { Onboarding } from "@/pages/Onboarding";

const queryClient = new QueryClient();

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const [locale, setLocale] = useState<LocaleKey>(
    () => {
      try {
        const saved = localStorage.getItem("wellfarm-locale");
        return saved && Object.hasOwn(languageNames, saved) ? saved as LocaleKey : "en";
      } catch { return "en"; }
    },
  );
  const changeLocale = (next: LocaleKey) => {
    setLocale(next);
    try { localStorage.setItem("wellfarm-locale", next); } catch { /* Still switch when browser storage is disabled. */ }
  };
  const props = { locale, setLocale: changeLocale };

  return (
    <AccountProvider><TranslationProvider locale={locale}><RoutedErrorBoundary>
      <AccountGate><Switch>
        <Route path="/login"><Login /></Route>
        <Route path="/onboarding"><Onboarding {...props} /></Route>
        <Route path="/admin"><AdminPage {...props} /></Route>
        <Route path="/messages"><MessagesPage {...props} /></Route>
        <Route path="/"><PublicHome {...props} /></Route>
        <Route path="/workspaces"><Roles {...props} /></Route>
        <Route path="/roles"><Roles {...props} /></Route>
        <Route path="/farmer"><FarmerHome {...props} /></Route>
        <Route path="/farmer/scan"><ScanJourney {...props} /></Route>
        <Route path="/farmer/history"><FarmerHistory {...props} /></Route>
        <Route path="/farmer/history/:id"><FarmerHistory {...props} /></Route>
        <Route path="/insights"><RegionalOverview {...props} /></Route>
        <Route path="/insights/intelligence"><RegionalIntelligence {...props} /></Route>
        <Route path="/insights/district/:id"><RegionalDistrict {...props} /></Route>
        <Route path="/transparency"><Transparency {...props} /></Route>
        <Route path="/profile"><ProfilePage {...props} /></Route>
        <Route component={NotFound} />
      </Switch></AccountGate>
    </RoutedErrorBoundary></TranslationProvider></AccountProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
