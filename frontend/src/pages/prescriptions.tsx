import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prescription } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScanLine,
  Pill,
  AlertTriangle,
  Bell,
  Clock,
  FileText,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type DetectedMedicine = {
  extractedName: string;
  matchedMedicineId?: number;
  matchedName?: string;
  dosage?: string;
  duration?: string;
  instructions?: string;
  confidence: number;
};

function confidenceColor(confidence: number) {
  if (confidence > 0.7) return "text-emerald-600 dark:text-emerald-400";
  if (confidence >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function confidenceBgColor(confidence: number) {
  if (confidence > 0.7) return "bg-emerald-500";
  if (confidence >= 0.4) return "bg-amber-500";
  return "bg-red-500";
}

function confidenceBadgeVariant(confidence: number): "default" | "secondary" | "destructive" {
  if (confidence > 0.7) return "default";
  if (confidence >= 0.4) return "secondary";
  return "destructive";
}

function confidenceLabel(confidence: number) {
  if (confidence > 0.7) return "High";
  if (confidence >= 0.4) return "Medium";
  return "Low";
}

export default function PrescriptionsPage() {
  const [rawText, setRawText] = useState("");
  const [parsedResults, setParsedResults] = useState<DetectedMedicine[] | null>(null);
  const { toast } = useToast();

  const { data: prescriptions, isLoading: historyLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/prescriptions"],
  });

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/prescriptions/parse", { rawText: text });
      return await res.json();
    },
    onSuccess: (data: { detectedMedicines: DetectedMedicine[] }) => {
      setParsedResults(data.detectedMedicines ?? []);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: "Prescription scanned",
        description: `Detected ${data.detectedMedicines?.length ?? 0} medicine(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScan = () => {
    if (!rawText.trim()) {
      toast({
        title: "Empty prescription",
        description: "Please enter or paste prescription text first.",
        variant: "destructive",
      });
      return;
    }
    parseMutation.mutate(rawText);
  };

  const multipleDetected = parsedResults && parsedResults.length > 1;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Prescription Scanner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste or type your prescription text to detect medicines automatically.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Scan Prescription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            data-testid="input-prescription-text"
            placeholder={"Enter prescription text here...\ne.g. Paracetamol 500mg twice daily for 5 days\nAmoxicillin 500mg three times daily"}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            className="resize-none"
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span data-testid="text-example-hint">
                Try entering: Crocin 500mg twice daily for 5 days
              </span>
            </div>
            <Button
              data-testid="button-scan-prescription"
              onClick={handleScan}
              disabled={parseMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {parseMutation.isPending ? (
                <>Scanning...</>
              ) : (
                <>
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scan Prescription
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsedResults !== null && (
        <div className="space-y-4" data-testid="section-parsed-results">
          <h2 className="text-lg font-semibold">Detected Medicines</h2>

          {parsedResults.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No medicines were detected in the prescription text.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {multipleDetected && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4 flex items-center gap-3" data-testid="alert-interaction-warning">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Multiple medicines detected</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Check for potential drug interactions before taking these medicines together.
                      </p>
                    </div>
                    <Link href="/interactions">
                      <Button variant="outline" size="sm" data-testid="button-check-interactions">
                        Check Interactions
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {parsedResults.map((med, index) => (
                  <Card key={index} data-testid={`card-medicine-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold" data-testid={`text-extracted-name-${index}`}>
                              {med.extractedName}
                            </p>
                            <Badge
                              variant={confidenceBadgeVariant(med.confidence)}
                              data-testid={`badge-confidence-${index}`}
                            >
                              {confidenceLabel(med.confidence)} ({Math.round(med.confidence * 100)}%)
                            </Badge>
                          </div>

                          {med.matchedName && (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground" data-testid={`text-matched-name-${index}`}>
                                Matched: <span className="font-medium text-foreground">{med.matchedName}</span>
                              </p>
                            </div>
                          )}

                          <div className="w-full max-w-xs">
                            <Progress
                              value={med.confidence * 100}
                              className="h-1.5"
                              data-testid={`progress-confidence-${index}`}
                            />
                          </div>

                          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                            {med.dosage && (
                              <span data-testid={`text-dosage-${index}`}>
                                Dosage: <span className="font-medium text-foreground">{med.dosage}</span>
                              </span>
                            )}
                            {med.duration && (
                              <span data-testid={`text-duration-${index}`}>
                                Duration: <span className="font-medium text-foreground">{med.duration}</span>
                              </span>
                            )}
                            {med.instructions && (
                              <span data-testid={`text-instructions-${index}`}>
                                Instructions: <span className="font-medium text-foreground">{med.instructions}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <Link href="/reminders">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-set-reminder-${index}`}
                          >
                            <Bell className="w-3.5 h-3.5 mr-1" />
                            Set Reminder
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Prescription History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !prescriptions || prescriptions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-history">
                No prescription scans yet. Try scanning one above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {prescriptions.map((rx) => {
                const detected = (rx.detectedMedicines as DetectedMedicine[]) ?? [];
                return (
                  <div
                    key={rx.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`history-item-${rx.id}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-history-preview-${rx.id}`}>
                        {rx.rawText
                          ? rx.rawText.substring(0, 60) + (rx.rawText.length > 60 ? "..." : "")
                          : "Prescription scan"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground" data-testid={`text-history-date-${rx.id}`}>
                          {rx.createdAt
                            ? new Date(rx.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Unknown date"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-detected-count-${rx.id}`}>
                      {detected.length} medicine{detected.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
