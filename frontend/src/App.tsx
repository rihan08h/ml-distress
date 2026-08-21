import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun } from "lucide-react";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import MedicinesPage from "@/pages/medicines";
import InteractionsPage from "@/pages/interactions";
import RemindersPage from "@/pages/reminders";
import PharmaciesPage from "@/pages/pharmacies";
import VerifyPage from "@/pages/verify";
import PrescriptionsPage from "@/pages/prescriptions";
import EmergencyPage from "@/pages/emergency";
import SymptomCheckerPage from "@/pages/symptom-checker";
import PharmacyPortalPage from "@/pages/pharmacy-portal";
import ReservationsPage from "@/pages/reservations";
import { useEffect } from "react";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle-header">
      {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </Button>
  );
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b h-14 flex-shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/medicines" component={MedicinesPage} />
              <Route path="/interactions" component={InteractionsPage} />
              <Route path="/reminders" component={RemindersPage} />
              <Route path="/pharmacies" component={PharmaciesPage} />
              <Route path="/verify" component={VerifyPage} />
              <Route path="/prescriptions" component={PrescriptionsPage} />
              <Route path="/emergency" component={EmergencyPage} />
              <Route path="/symptom-checker" component={SymptomCheckerPage} />
              <Route path="/pharmacy-portal" component={PharmacyPortalPage} />
              <Route path="/reservations" component={ReservationsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user && (location === "/" || location === "/auth")) {
      navigate("/dashboard");
    }
  }, [user, isLoading, location, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (location === "/" && !user) {
    return <LandingPage />;
  }

  if (location === "/auth" || location.startsWith("/auth?")) {
    return <AuthPage />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
