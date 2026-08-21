import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import type { Medicine } from "@shared/schema";
import {
  ShieldCheck,
  Search,
  Plus,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Pill,
  Loader2,
} from "lucide-react";

interface InteractionResult {
  medicineA: string;
  medicineB: string;
  severity: string;
  description: string;
  recommendation: string;
  source: string;
}

interface CheckResult {
  totalChecked: number;
  interactionsFound: number;
  interactions: InteractionResult[];
  safeCombinations: { medicineA: string; medicineB: string }[];
}

export default function InteractionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedicines, setSelectedMedicines] = useState<Medicine[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);

  const { data: searchResults, isLoading: searching } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines", `?q=${encodeURIComponent(searchQuery)}&limit=5`],
    enabled: searchQuery.length >= 2,
  });

  const checkMutation = useMutation({
    mutationFn: async (medicineIds: number[]) => {
      const res = await apiRequest("POST", "/api/safety/interactions", {
        medicineIds,
      });
      return res.json();
    },
    onSuccess: (data: CheckResult) => {
      setResult(data);
    },
  });

  const addMedicine = (med: Medicine) => {
    if (!selectedMedicines.find((m) => m.id === med.id)) {
      setSelectedMedicines([...selectedMedicines, med]);
    }
    setSearchQuery("");
  };

  const removeMedicine = (id: number) => {
    setSelectedMedicines(selectedMedicines.filter((m) => m.id !== id));
    setResult(null);
  };

  const checkInteractions = () => {
    if (selectedMedicines.length >= 2) {
      checkMutation.mutate(selectedMedicines.map((m) => m.id));
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "major":
      case "contraindicated":
        return {
          icon: ShieldAlert,
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-500/10 border-red-500/20",
          badge: "bg-red-500/10 text-red-600 dark:text-red-400",
          label: "Major",
        };
      case "moderate":
        return {
          icon: AlertTriangle,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/20",
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          label: "Moderate",
        };
      case "minor":
        return {
          icon: Info,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-500/10 border-blue-500/20",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          label: "Minor",
        };
      default:
        return {
          icon: AlertCircle,
          color: "text-muted-foreground",
          bg: "bg-muted",
          badge: "bg-muted text-muted-foreground",
          label: severity,
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-interactions-title">
          Drug Interaction Checker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Check for potentially dangerous drug combinations. Select at least 2 medicines.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Medicines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search and add medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-interaction-search"
            />
          </div>

          {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {searchResults.map((med) => (
                <button
                  key={med.id}
                  onClick={() => addMedicine(med)}
                  disabled={!!selectedMedicines.find((m) => m.id === med.id)}
                  className="w-full flex items-center gap-2 p-3 text-left text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                  data-testid={`button-add-medicine-${med.id}`}
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{med.name}</span>
                  {med.genericName && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">({med.genericName})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedMedicines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedMedicines.map((med) => (
                <div
                  key={med.id}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-md px-3 py-1.5"
                  data-testid={`selected-medicine-${med.id}`}
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">{med.name}</span>
                  <button
                    onClick={() => removeMedicine(med.id)}
                    className="ml-1 hover:opacity-70"
                    data-testid={`button-remove-medicine-${med.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={checkInteractions}
            disabled={selectedMedicines.length < 2 || checkMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-check-interactions"
          >
            {checkMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Check Interactions ({selectedMedicines.length} selected)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" data-testid="text-total-checked">
              {result.totalChecked} pairs checked
            </Badge>
            {result.interactionsFound > 0 ? (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400" data-testid="text-interactions-found">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {result.interactionsFound} interaction{result.interactionsFound > 1 ? "s" : ""} found
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" data-testid="text-no-interactions">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                No interactions found
              </Badge>
            )}
          </div>

          {result.interactions.length > 0 && (
            <div className="space-y-3">
              {result.interactions.map((interaction, idx) => {
                const config = getSeverityConfig(interaction.severity);
                const Icon = config.icon;
                return (
                  <Card key={idx} className={`border ${config.bg}`} data-testid={`interaction-result-${idx}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold">{interaction.medicineA}</span>
                            <span className="text-xs text-muted-foreground">+</span>
                            <span className="text-sm font-semibold">{interaction.medicineB}</span>
                            <Badge className={`text-xs ${config.badge}`}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {interaction.description}
                          </p>
                          {interaction.recommendation && (
                            <p className="text-sm">
                              <span className="font-medium">Recommendation:</span>{" "}
                              {interaction.recommendation}
                            </p>
                          )}
                          {interaction.source && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Source: {interaction.source}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {result.safeCombinations.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium">Safe Combinations</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.safeCombinations.map((combo, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs" data-testid={`safe-combo-${idx}`}>
                      {combo.medicineA} + {combo.medicineB}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && selectedMedicines.length === 0 && (
        <div className="text-center py-16">
          <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-medium text-muted-foreground">Check Drug Interactions</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Search and select at least 2 medicines above to check for potentially dangerous drug interactions.
          </p>
        </div>
      )}
    </div>
  );
}
