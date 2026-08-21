import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, MapPin, Package, Pill, X } from "lucide-react";

type ReservationWithDetails = {
  id: number;
  userId: number;
  pharmacyId: number;
  medicineId: number;
  quantity: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  pharmacy?: { id: number; name: string; address: string; phone: string };
  medicine?: { id: number; name: string; manufacturer: string };
};

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "pending": return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "cancelled": return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "completed": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export default function ReservationsPage() {
  const { toast } = useToast();

  const { data: reservations, isLoading } = useQuery<ReservationWithDetails[]>({
    queryKey: ["/api/reservations"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/reservations/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "Reservation cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Reservations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your medicine reservations
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reservations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reserve medicines from the Pharmacy Locator or Emergency Finder pages
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" />
                      <span className="font-semibold">
                        {r.medicine?.name || `Medicine #${r.medicineId}`}
                      </span>
                      <Badge className={getStatusColor(r.status)} variant="secondary">
                        {r.status}
                      </Badge>
                    </div>

                    {r.medicine?.manufacturer && (
                      <p className="text-xs text-muted-foreground">{r.medicine.manufacturer}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        Qty: {r.quantity}
                      </span>
                      {r.pharmacy && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {r.pharmacy.name}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Reserved: {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {r.expiresAt && <> &middot; Expires: {new Date(r.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short",
                      })}</>}
                    </p>
                  </div>

                  {(r.status === "pending" || r.status === "confirmed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelMutation.mutate(r.id)}
                      disabled={cancelMutation.isPending}
                      className="text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
