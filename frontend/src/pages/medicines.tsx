import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Medicine } from "@shared/schema";
import {
  Search,
  Pill,
  AlertTriangle,
  ChevronRight,
  Package,
  Stethoscope,
  IndianRupee,
  X,
  Beaker,
  FileText,
  ShieldAlert,
  ThermometerSun,
  ArrowDown,
} from "lucide-react";

export default function MedicinesPage() {
  const [search, setSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: medicines, isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines", `?q=${encodeURIComponent(search)}`],
  });

  const { data: generics } = useQuery<{ brandMedicine: Medicine; alternatives: (Medicine & { savingsPercent: string })[] }>({
    queryKey: ["/api/medicines", selectedMedicine?.id, "generics"],
    enabled: !!selectedMedicine,
    queryFn: async () => {
      const res = await fetch(`/api/medicines/${selectedMedicine!.id}/generics`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch generics");
      return res.json();
    },
  });

  const openDetail = (med: Medicine) => {
    setSelectedMedicine(med);
    setDetailOpen(true);
  };

  const getSeverityColor = (form: string | null) => {
    if (!form) return "bg-muted text-muted-foreground";
    const f = form.toLowerCase();
    if (f === "tablet") return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (f === "capsule") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (f === "syrup") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    if (f === "injection") return "bg-red-500/10 text-red-600 dark:text-red-400";
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-medicines-title">
          Medicine Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search by medicine name, brand, or composition.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search medicines... (e.g., Paracetamol, Amoxicillin)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-medicine-search"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : medicines && medicines.length > 0 ? (
        <div className="grid gap-3">
          {medicines.map((med) => (
            <Card
              key={med.id}
              className="hover-elevate cursor-pointer"
              onClick={() => openDetail(med)}
              data-testid={`card-medicine-${med.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${getSeverityColor(med.dosageForm)}`}>
                    <Pill className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate" data-testid={`text-medicine-name-${med.id}`}>
                          {med.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {med.manufacturer} {med.brand ? `(${med.brand})` : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {med.genericName && (
                        <Badge variant="secondary" className="text-xs">
                          <Beaker className="w-3 h-3 mr-1" />
                          {med.genericName}
                        </Badge>
                      )}
                      {med.dosageForm && (
                        <Badge variant="outline" className="text-xs">
                          {med.dosageForm}
                        </Badge>
                      )}
                      {med.priceMrp && (
                        <Badge variant="outline" className="text-xs">
                          <IndianRupee className="w-3 h-3 mr-0.5" />
                          {med.priceMrp}
                        </Badge>
                      )}
                      {med.prescriptionRequired && (
                        <Badge variant="destructive" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          Rx
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-medium text-muted-foreground" data-testid="text-no-results">
            {search ? "No medicines found" : "Start searching for medicines"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search
              ? "Try a different search term"
              : "Enter a medicine name, brand, or composition above"}
          </p>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              {selectedMedicine?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMedicine && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {selectedMedicine.genericName && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Generic Name</p>
                      <p className="text-sm font-medium">{selectedMedicine.genericName}</p>
                    </div>
                  )}
                  {selectedMedicine.manufacturer && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Manufacturer</p>
                      <p className="text-sm font-medium">{selectedMedicine.manufacturer}</p>
                    </div>
                  )}
                  {selectedMedicine.dosageForm && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Form</p>
                      <p className="text-sm font-medium capitalize">{selectedMedicine.dosageForm}</p>
                    </div>
                  )}
                  {selectedMedicine.category && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm font-medium capitalize">{selectedMedicine.category}</p>
                    </div>
                  )}
                </div>

                {selectedMedicine.priceMrp && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Price (MRP)</p>
                        <p className="text-sm font-semibold">
                          {"\u20B9"}{selectedMedicine.priceMrp} {selectedMedicine.packSize && `/ ${selectedMedicine.packSize}`}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {selectedMedicine.composition && (selectedMedicine.composition as any[]).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Beaker className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium">Composition</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedMedicine.composition as { ingredient: string; strength: string }[]).map((c, i) => (
                          <Badge key={i} variant="secondary">
                            {c.ingredient} {c.strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedMedicine.dosageInstructions && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Stethoscope className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium">Dosage Instructions</p>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        {(selectedMedicine.dosageInstructions as any)?.adults && (
                          <p><span className="text-muted-foreground">Adults:</span> {(selectedMedicine.dosageInstructions as any).adults}</p>
                        )}
                        {(selectedMedicine.dosageInstructions as any)?.children && (
                          <p><span className="text-muted-foreground">Children:</span> {(selectedMedicine.dosageInstructions as any).children}</p>
                        )}
                        {(selectedMedicine.dosageInstructions as any)?.withFood && (
                          <p><span className="text-muted-foreground">With food:</span> {(selectedMedicine.dosageInstructions as any).withFood}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedMedicine.sideEffects && Object.keys(selectedMedicine.sideEffects as any).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-medium">Side Effects</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        {(selectedMedicine.sideEffects as any)?.common?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Common</p>
                            <div className="flex flex-wrap gap-1">
                              {(selectedMedicine.sideEffects as any).common.map((s: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selectedMedicine.sideEffects as any)?.rare?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Rare</p>
                            <div className="flex flex-wrap gap-1">
                              {(selectedMedicine.sideEffects as any).rare.map((s: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {generics && generics.alternatives.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-medium">Generic Alternatives (Save Money)</p>
                      </div>
                      <div className="space-y-2">
                        {generics.alternatives.map((alt) => (
                          <div
                            key={alt.id}
                            className="flex items-center justify-between gap-2 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/10"
                            data-testid={`generic-alt-${alt.id}`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{alt.name}</p>
                              <p className="text-xs text-muted-foreground">{alt.manufacturer}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {"\u20B9"}{alt.priceMrp}
                              </p>
                              {alt.savingsPercent && (
                                <Badge variant="secondary" className="text-xs">
                                  Save {alt.savingsPercent}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedMedicine.storageInfo && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <ThermometerSun className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{selectedMedicine.storageInfo}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
