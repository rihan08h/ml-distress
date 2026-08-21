import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SYMPTOM_LIST } from "@shared/schema";
import type { SymptomSession } from "@shared/schema";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Crown,
  Grid3X3,
  History,
  MessageCircle,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";

type AnalysisResult = {
  riskLevel: string;
  predictions: {
    disease: string;
    confidence: number;
    description?: string;
    firstAid?: string[];
    precautions?: string[];
  }[];
};

type ChatMessage = {
  role: "user" | "bot";
  text: string;
  data?: {
    type: string;
    disease?: string;
    confidence?: number;
    riskLevel?: string;
    firstAid?: string[];
    precautions?: string[];
  };
};

function getRiskColor(risk: string) {
  switch (risk) {
    case "low":
      return "bg-emerald-500";
    case "medium":
      return "bg-amber-500";
    case "high":
      return "bg-red-500";
    case "emergency":
      return "bg-red-900";
    default:
      return "bg-muted";
  }
}

function getRiskTextColor(risk: string) {
  switch (risk) {
    case "low":
      return "text-emerald-700 dark:text-emerald-400";
    case "medium":
      return "text-amber-700 dark:text-amber-400";
    case "high":
      return "text-red-600 dark:text-red-400";
    case "emergency":
      return "text-red-800 dark:text-red-300";
    default:
      return "text-muted-foreground";
  }
}

function getRiskBgLight(risk: string) {
  switch (risk) {
    case "low":
      return "bg-emerald-500/10";
    case "medium":
      return "bg-amber-500/10";
    case "high":
      return "bg-red-500/10";
    case "emergency":
      return "bg-red-900/10";
    default:
      return "bg-muted/50";
  }
}

function getRiskLabel(risk: string) {
  switch (risk) {
    case "low":
      return "Low Risk";
    case "medium":
      return "Medium Risk";
    case "high":
      return "High Risk";
    case "emergency":
      return "Emergency";
    default:
      return risk;
  }
}

export default function SymptomCheckerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"chat" | "grid">("chat");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hello! I'm MediSafe's AI Symptom Checker. Describe your symptoms in plain language and I'll analyze them against 60+ medical conditions.\n\nYou can say things like:\n• \"I have a headache and fever\"\n• \"chest pain, shortness of breath, sweating\"\n• \"I feel fatigued and dizzy with joint pain\"" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isPremium = user?.subscriptionTier === "premium";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/upgrade", { tier: "premium" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Upgrade successful", description: "You now have premium access!" });
    },
    onError: (error: Error) => {
      toast({ title: "Upgrade failed", description: error.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (symptoms: string[]) => {
      const res = await apiRequest("POST", "/api/symptoms/analyze", { symptoms });
      return res.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/history"] });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/symptoms/chat", { message });
      return res.json() as Promise<{ text: string; data?: ChatMessage["data"] }>;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "bot", text: data.text, data: data.data }]);
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms/history"] });
    },
    onError: (error: Error) => {
      setMessages(prev => [...prev, { role: "bot", text: "Sorry, something went wrong. Please try again." }]);
    },
  });

  const { data: history, isLoading: historyLoading } = useQuery<SymptomSession[]>({
    queryKey: ["/api/symptoms/history"],
    enabled: isPremium,
  });

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => prev.filter((s) => s !== symptom));
  };

  const sendChatMessage = () => {
    const msg = chatInput.trim();
    if (!msg || chatMutation.isPending) return;
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatInput("");
    chatMutation.mutate(msg);
  };

  if (!isPremium) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card data-testid="card-upgrade-prompt">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-md bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <Crown className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl">AI Symptom Checker</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Get instant AI-powered health assessments based on your symptoms
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold" data-testid="text-pricing">
                ₹299<span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
            </div>

            <div className="space-y-2">
              {[
                "AI-powered symptom analysis (60+ conditions)",
                "Interactive chatbot conversation",
                "Risk level assessment",
                "First aid & precaution recommendations",
                "Disease prediction with confidence scores",
                "Session history tracking",
                "Emergency alerts and guidance",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              data-testid="button-upgrade-premium"
            >
              {upgradeMutation.isPending ? "Upgrading..." : "Upgrade to Premium"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          AI Symptom Checker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Powered by 60+ medical condition analysis engine
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={activeTab === "chat" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("chat")}
          className="gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Chat with AI
        </Button>
        <Button
          variant={activeTab === "grid" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("grid")}
          className="gap-2"
        >
          <Grid3X3 className="w-4 h-4" />
          Symptom Grid
        </Button>
      </div>

      {/* === CHATBOT TAB === */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 bg-primary/5 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">MediSafe AI Assistant</CardTitle>
                  <p className="text-xs text-muted-foreground">Describe symptoms in natural language</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Chat messages */}
              <div className="h-[420px] overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "bot" && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {/* Show structured data for diagnosis */}
                      {msg.data?.type === "diagnosis" && msg.data.riskLevel && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getRiskColor(msg.data.riskLevel)}`} />
                            <span className={`text-xs font-medium ${msg.role === "bot" ? getRiskTextColor(msg.data.riskLevel) : ""}`}>
                              {getRiskLabel(msg.data.riskLevel)}
                            </span>
                          </div>
                          {msg.data.riskLevel === "emergency" && (
                            <a href="tel:112">
                              <Button variant="destructive" size="sm" className="mt-1">
                                <Phone className="w-3 h-3 mr-1" />
                                Call 112
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="border-t p-3 flex gap-2">
                <Textarea
                  placeholder="Describe your symptoms... (e.g., I have a headache and fever)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  className="min-h-[44px] max-h-[100px] resize-none"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatMutation.isPending}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick symptom suggestions for chat */}
          <div className="flex flex-wrap gap-2">
            {["I have a headache and fever", "chest pain and shortness of breath", "fatigue and joint pain", "skin rash and itching", "stomach pain and nausea"].map(suggestion => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => {
                  setChatInput(suggestion);
                }}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* === GRID TAB === */}
      {activeTab === "grid" && (
        <div className="space-y-4">
          {selectedSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="selected-symptoms-list">
              {selectedSymptoms.map((symptom) => (
                <Badge
                  key={symptom}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeSymptom(symptom)}
                >
                  {symptom}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Symptoms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-testid="symptom-grid">
                {SYMPTOM_LIST.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom);
                  return (
                    <Button
                      key={symptom}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSymptom(symptom)}
                    >
                      {symptom}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            disabled={selectedSymptoms.length === 0 || analyzeMutation.isPending}
            onClick={() => analyzeMutation.mutate(selectedSymptoms)}
            data-testid="button-analyze-symptoms"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Symptoms"}
          </Button>

          {analysisResult && (
            <div className="space-y-4" data-testid="analysis-results">
              {analysisResult.riskLevel === "emergency" && (
                <Card className="border-red-500/50" data-testid="card-emergency-warning">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-red-700 dark:text-red-400">Emergency Warning</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your symptoms may indicate a serious condition. Please seek immediate medical attention.
                        </p>
                        <a href="tel:112">
                          <Button variant="destructive" size="sm" className="mt-3">
                            <Phone className="w-4 h-4 mr-2" />
                            Call 112 Now
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-risk-level">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getRiskColor(analysisResult.riskLevel)}`} />
                    <p className={`font-semibold ${getRiskTextColor(analysisResult.riskLevel)}`}>
                      {getRiskLabel(analysisResult.riskLevel)}
                    </p>
                  </div>
                  <div className="mt-2">
                    <div className={`h-2 rounded-full ${getRiskBgLight(analysisResult.riskLevel)}`}>
                      <div
                        className={`h-2 rounded-full ${getRiskColor(analysisResult.riskLevel)}`}
                        style={{
                          width:
                            analysisResult.riskLevel === "low"
                              ? "25%"
                              : analysisResult.riskLevel === "medium"
                                ? "50%"
                                : analysisResult.riskLevel === "high"
                                  ? "75%"
                                  : "100%",
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analysisResult.predictions.map((prediction, idx) => (
                <Card key={idx} data-testid={`card-prediction-${idx}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{prediction.disease}</p>
                        {prediction.description && (
                          <p className="text-sm text-muted-foreground mt-1">{prediction.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{Math.round(prediction.confidence * 100)}%</Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Confidence</span>
                        <span>{Math.round(prediction.confidence * 100)}%</span>
                      </div>
                      <Progress value={prediction.confidence * 100} />
                    </div>

                    {prediction.firstAid && prediction.firstAid.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">First Aid Suggestions</p>
                        <div className="space-y-1.5">
                          {prediction.firstAid.map((item, aidIdx) => (
                            <div key={aidIdx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {prediction.precautions && prediction.precautions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Precautions</p>
                        <div className="space-y-1.5">
                          {prediction.precautions.map((item, pIdx) => (
                            <div key={pIdx} className="flex items-start gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Symptom History</CardTitle>
          </div>
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
              <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-history">
                No symptom analysis history yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                >
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${getRiskColor(session.riskLevel ?? "low")}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(session.inputSymptoms as string[])?.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                      {(session.inputSymptoms as string[])?.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{(session.inputSymptoms as string[]).length - 3} more
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getRiskTextColor(session.riskLevel ?? "low")}
                  >
                    {getRiskLabel(session.riskLevel ?? "low")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-muted-foreground" data-testid="text-medical-disclaimer">
            <span className="font-medium text-foreground">Medical Disclaimer:</span>{" "}
            This AI symptom checker is for informational purposes only and does not constitute medical advice.
            Always consult a qualified healthcare professional for diagnosis and treatment.
            In case of emergency, call 112 immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
