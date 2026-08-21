import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MedicineVerification } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ScanBarcode,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [codeType, setCodeType] = useState("barcode");

  const { data: history, isLoading: historyLoading } = useQuery<MedicineVerification[]>({
    queryKey: ["/api/verify/history"],
  });

  const verifyMutation = useMutation({
    mutationFn: async (payload: { code: string; codeType: string }) => {
      const res = await apiRequest("POST", "/api/verify", payload);
      return (await res.json()) as MedicineVerification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verify/history"] });
    },
  });

  const result = verifyMutation.data;

  const handleVerify = () => {
    if (!code.trim()) return;
    verifyMutation.mutate({ code: code.trim(), codeType });
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-verify-title">
          Medicine Authenticity Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify if your medicine is authentic by entering its barcode or QR code.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Verify Medicine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code-input">Medicine Code</Label>
            <Input
              id="code-input"
              placeholder="Enter barcode or QR code value"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              data-testid="input-code"
            />
            <p className="text-xs text-muted-foreground">
              Try MED-2024-001, MED-2024-002, or FAKE-001
            </p>
          </div>

          <div className="space-y-2">
            <Label>Code Type</Label>
            <RadioGroup
              value={codeType}
              onValueChange={setCodeType}
              className="flex items-center gap-4"
              data-testid="radio-code-type"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="barcode" id="type-barcode" data-testid="radio-barcode" />
                <Label htmlFor="type-barcode" className="flex items-center gap-1.5 cursor-pointer font-normal">
                  <ScanBarcode className="w-4 h-4" />
                  Barcode
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="qrcode" id="type-qrcode" data-testid="radio-qrcode" />
                <Label htmlFor="type-qrcode" className="flex items-center gap-1.5 cursor-pointer font-normal">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleVerify}
            disabled={!code.trim() || verifyMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="button-verify"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && <VerificationResult result={result} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Verification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8">
              <ShieldQuestion className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-history">
                No verification history yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationResult({ result }: { result: MedicineVerification }) {
  const isAuthentic = result.isAuthentic === true;
  const isCounterfeit = result.isAuthentic === false;
  const isUnknown = result.isAuthentic === null || result.isAuthentic === undefined;

  const confidence = result.verificationResult?.confidence ?? "low";

  let borderClass = "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20";
  let IconComponent = AlertTriangle;
  let iconClass = "text-amber-600 dark:text-amber-400";
  let titleText = "Unknown Medicine";
  let titleClass = "text-amber-700 dark:text-amber-300";

  if (isAuthentic) {
    borderClass = "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20";
    IconComponent = CheckCircle2;
    iconClass = "text-emerald-600 dark:text-emerald-400";
    titleText = "Authentic Medicine";
    titleClass = "text-emerald-700 dark:text-emerald-300";
  } else if (isCounterfeit) {
    borderClass = "border-red-500/30 bg-red-50 dark:bg-red-950/20";
    IconComponent = XCircle;
    iconClass = "text-red-600 dark:text-red-400";
    titleText = "Counterfeit Warning";
    titleClass = "text-red-700 dark:text-red-300";
  }

  const confidenceBadgeVariant =
    confidence === "high" ? "default" : confidence === "medium" ? "secondary" : "outline";

  return (
    <Card className={`border ${borderClass}`} data-testid="card-verification-result">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-6 h-6 ${iconClass}`} />
            <h3 className={`text-lg font-semibold ${titleClass}`} data-testid="text-result-title">
              {titleText}
            </h3>
          </div>
          <Badge variant={confidenceBadgeVariant} data-testid="badge-confidence">
            {confidence} confidence
          </Badge>
        </div>

        {isAuthentic && result.medicineInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.medicineInfo.name && (
              <DetailRow label="Name" value={result.medicineInfo.name} testId="text-medicine-name" />
            )}
            {result.medicineInfo.manufacturer && (
              <DetailRow label="Manufacturer" value={result.medicineInfo.manufacturer} testId="text-manufacturer" />
            )}
            {result.medicineInfo.batchNumber && (
              <DetailRow label="Batch Number" value={result.medicineInfo.batchNumber} testId="text-batch" />
            )}
            {result.medicineInfo.manufacturingDate && (
              <DetailRow label="Manufacturing Date" value={result.medicineInfo.manufacturingDate} testId="text-mfg-date" />
            )}
            {result.medicineInfo.expiryDate && (
              <DetailRow label="Expiry Date" value={result.medicineInfo.expiryDate} testId="text-expiry-date" />
            )}
            {result.medicineInfo.packSize && (
              <DetailRow label="Pack Size" value={result.medicineInfo.packSize} testId="text-pack-size" />
            )}
          </div>
        )}

        {isCounterfeit && (
          <div className="space-y-2">
            {result.verificationResult?.reason && (
              <p className="text-sm text-red-700 dark:text-red-300" data-testid="text-counterfeit-reason">
                {result.verificationResult.reason}
              </p>
            )}
            {result.verificationResult?.actionRequired && (
              <p className="text-sm font-medium text-red-800 dark:text-red-200" data-testid="text-action-required">
                Action Required: {result.verificationResult.actionRequired}
              </p>
            )}
          </div>
        )}

        {isUnknown && (
          <div className="space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-300" data-testid="text-unknown-message">
              This code could not be found in our database.
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Double-check the code for typos</li>
              <li>Try scanning the code again</li>
              <li>Contact the manufacturer directly</li>
              <li>Report suspicious packaging to authorities</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium" data-testid={testId}>{value}</p>
    </div>
  );
}

function HistoryItem({ item }: { item: MedicineVerification }) {
  const isAuthentic = item.isAuthentic === true;
  const isCounterfeit = item.isAuthentic === false;

  let StatusIcon = AlertTriangle;
  let iconClass = "text-amber-500";
  let statusText = "Unknown";

  if (isAuthentic) {
    StatusIcon = CheckCircle2;
    iconClass = "text-emerald-500";
    statusText = "Authentic";
  } else if (isCounterfeit) {
    StatusIcon = XCircle;
    iconClass = "text-red-500";
    statusText = "Counterfeit";
  }

  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
      data-testid={`history-item-${item.id}`}
    >
      <StatusIcon className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid={`history-code-${item.id}`}>
          {item.code}
        </p>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
      <Badge
        variant={isAuthentic ? "default" : isCounterfeit ? "destructive" : "secondary"}
        data-testid={`history-status-${item.id}`}
      >
        {statusText}
      </Badge>
    </div>
  );
}
