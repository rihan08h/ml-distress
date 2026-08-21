import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reminder, Medicine } from "@shared/schema";
import {
  Search,
  ShieldCheck,
  Bell,
  Pill,
  ArrowRight,
  Clock,
  AlertCircle,
  ChevronRight,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: reminders, isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: medicines, isLoading: medicinesLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines", "?limit=4"],
  });

  const activeReminders = reminders?.filter((r) => r.isActive) ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-welcome">
          Welcome back, {user?.fullName?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's an overview of your medicine management.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/medicines">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Medicine Search</p>
                  <span className="text-2xl font-bold mt-1 block" data-testid="text-medicine-count">
                    {medicinesLoading ? <Skeleton className="h-8 w-16" /> : `${medicines?.length ?? 0}+`}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">medicines available</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/interactions">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Drug Interactions</p>
                  <p className="text-2xl font-bold mt-1">Check</p>
                  <p className="text-xs text-muted-foreground mt-1">safety of combinations</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reminders">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Active Reminders</p>
                  <span className="text-2xl font-bold mt-1 block" data-testid="text-reminder-count">
                    {remindersLoading ? <Skeleton className="h-8 w-16" /> : activeReminders.length}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">medicines tracked</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Active Reminders</CardTitle>
              <Link href="/reminders">
                <Button variant="ghost" size="sm" data-testid="button-view-all-reminders">
                  View all
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {remindersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : activeReminders.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active reminders</p>
                <Link href="/reminders">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-add-first-reminder">
                    Add your first reminder
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activeReminders.slice(0, 4).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`reminder-item-${reminder.id}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{reminder.medicineName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {reminder.frequency} &middot; {(reminder.times as string[])?.join(", ")}
                        </p>
                      </div>
                    </div>
                    {reminder.dosage && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        {reminder.dosage}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Link href="/medicines">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 cursor-pointer hover-elevate" data-testid="button-quick-search">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Search Medicines</p>
                  <p className="text-xs text-muted-foreground">Find medicines and generic alternatives</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/interactions">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 cursor-pointer hover-elevate" data-testid="button-quick-interactions">
                <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Check Drug Interactions</p>
                  <p className="text-xs text-muted-foreground">Verify safety of medicine combinations</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/reminders">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 cursor-pointer hover-elevate" data-testid="button-quick-reminders">
                <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Manage Reminders</p>
                  <p className="text-xs text-muted-foreground">Track your medication schedule</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-4 flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Medical Disclaimer:</span>{" "}
            This platform is for informational purposes only and should not replace professional medical advice. Always consult your healthcare provider.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
