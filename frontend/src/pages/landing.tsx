import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import {
  Search,
  ShieldCheck,
  Bell,
  Pill,
  ArrowRight,
  Shield,
  Heart,
  Zap,
  Moon,
  Sun,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Medicine Search",
    description: "Search thousands of medicines by name, brand, or composition. Find detailed information instantly.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Pill,
    title: "Generic Alternatives",
    description: "Discover affordable generic alternatives and save up to 80% on your medicine costs.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: ShieldCheck,
    title: "Drug Interaction Checker",
    description: "Check for dangerous drug combinations before taking multiple medicines together.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Bell,
    title: "Medicine Reminders",
    description: "Never miss a dose with smart reminders. Track your medication schedule effortlessly.",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
];

const stats = [
  { value: "10,000+", label: "Medicines" },
  { value: "500+", label: "Generic Options" },
  { value: "15,000+", label: "Interactions Tracked" },
  { value: "Free", label: "To Use" },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Pill className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold tracking-tight" data-testid="text-brand">MediSafe</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Link href="/auth">
                <Button variant="ghost" size="sm" data-testid="button-sign-in">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth?mode=register">
                <Button size="sm" data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              <Shield className="w-3 h-3 mr-1" />
              Trusted by healthcare professionals
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight" data-testid="text-hero-title">
              Smart Medicine Access{" "}
              <span className="text-primary">&</span>{" "}
              Safety Platform
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-description">
              Your trusted companion for safe medicine access. Search medicines,
              check drug interactions, find affordable alternatives, and manage
              your medication reminders — all in one place.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/auth?mode=register">
                <Button size="lg" data-testid="button-hero-cta">
                  Start for Free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" data-testid="button-hero-signin">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-primary" data-testid={`text-stat-${stat.label.toLowerCase().replace(/[\s+]/g, "-")}`}>
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" data-testid="text-features-title">
              Everything you need for safe medicine management
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comprehensive tools to help you make informed decisions about your medicines.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" data-testid={`text-feature-${feature.title.toLowerCase().replace(/\s/g, "-")}`}>
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to safer medicine management.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Search Your Medicine",
                description: "Enter the name of your medicine to find detailed information and alternatives.",
                icon: Search,
              },
              {
                step: "02",
                title: "Check Safety",
                description: "Verify drug interactions and find cheaper generic alternatives instantly.",
                icon: AlertTriangle,
              },
              {
                step: "03",
                title: "Stay on Track",
                description: "Set up personalized reminders to never miss a dose again.",
                icon: CheckCircle2,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary mb-2">{item.step}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8 sm:p-12 text-center">
              <Heart className="w-8 h-8 mx-auto mb-4 opacity-80" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Your health matters
              </h2>
              <p className="opacity-80 mb-6 max-w-lg mx-auto">
                Join thousands of users who trust MediSafe for their medicine management needs. Start using our platform for free today.
              </p>
              <Link href="/auth?mode=register">
                <Button variant="secondary" size="lg" data-testid="button-cta-signup">
                  Create Free Account
                  <Zap className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Pill className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">MediSafe</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Disclaimer: This platform is for informational purposes only. Always consult a healthcare professional.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
