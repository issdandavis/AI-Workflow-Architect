import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  Zap,
  Target,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface DecisionTrace {
  id: string;
  agentRunId: string;
  stepNumber: number;
  stepType: string;
  decision: string;
  reasoning: string;
  confidence: string | null;
  alternatives: unknown[] | null;
  contextUsed: Record<string, unknown> | null;
  durationMs: number | null;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const stepTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  provider_selection: { icon: Target, color: "text-blue-400", label: "Provider Selection" },
  retry: { icon: RotateCcw, color: "text-yellow-400", label: "Retry" },
  fallback: { icon: AlertTriangle, color: "text-orange-400", label: "Fallback" },
  model_selection: { icon: Brain, color: "text-purple-400", label: "Model Selection" },
  context_analysis: { icon: Zap, color: "text-cyan-400", label: "Context Analysis" },
  tool_call: { icon: Zap, color: "text-green-400", label: "Tool Call" },
  response_generation: { icon: MessageSquare, color: "text-emerald-400", label: "Response Generated" },
  error_handling: { icon: AlertCircle, color: "text-red-400", label: "Error Handling" },
};

const approvalStatusConfig = {
  not_required: { icon: CheckCircle, color: "text-gray-400", label: "Auto-approved", bg: "bg-gray-800" },
  pending: { icon: Clock, color: "text-amber-400", label: "Awaiting Approval", bg: "bg-amber-900/30" },
  approved: { icon: ShieldCheck, color: "text-green-400", label: "Approved", bg: "bg-green-900/30" },
  rejected: { icon: ShieldX, color: "text-red-400", label: "Rejected", bg: "bg-red-900/30" },
};

interface DecisionTraceViewerProps {
  runId: string;
  isOpen?: boolean;
}

export function DecisionTraceViewer({ runId, isOpen = true }: DecisionTraceViewerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const queryClient = useQueryClient();

  const { data: traces, isLoading, error } = useQuery<DecisionTrace[]>({
    queryKey: ["decision-traces", runId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/run/${runId}/traces`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch traces");
      return res.json();
    },
    enabled: isOpen && !!runId,
    refetchInterval: 5000,
  });

  const approveMutation = useMutation({
    mutationFn: async (traceId: string) => {
      const res = await fetch(`/api/approvals/${traceId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-traces", runId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ traceId, reason }: { traceId: string; reason: string }) => {
      const res = await fetch(`/api/approvals/${traceId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-traces", runId] });
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
  });

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  const handleRejectClick = (traceId: string) => {
    setSelectedTraceId(traceId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedTraceId && rejectionReason.trim()) {
      rejectMutation.mutate({ traceId: selectedTraceId, reason: rejectionReason });
    }
  };

  const pendingCount = traces?.filter(t => t.approvalStatus === "pending").length || 0;
  const lowConfidenceCount = traces?.filter(t => {
    const conf = t.confidence ? parseFloat(t.confidence) : 1;
    return conf < 0.7;
  }).length || 0;

  if (!isOpen) return null;

  return (
    <>
      <Card className="bg-gray-900/50 border-gray-700" data-testid="decision-trace-viewer">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4 text-purple-400" />
            Decision Trace
            {traces && <Badge variant="outline" className="ml-2">{traces.length} steps</Badge>}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse" data-testid="pending-approval-badge">
                {pendingCount} pending
              </Badge>
            )}
            {lowConfidenceCount > 0 && pendingCount === 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-900/50 text-amber-300" data-testid="low-confidence-badge">
                {lowConfidenceCount} low confidence
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8" data-testid="trace-loading">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Loading traces...</span>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm py-4" data-testid="trace-error">
              Failed to load decision traces
            </div>
          )}

          {traces && traces.length === 0 && (
            <div className="text-gray-500 text-sm py-4 text-center" data-testid="trace-empty">
              No decision traces recorded yet
            </div>
          )}

          {traces && traces.length > 0 && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                <AnimatePresence>
                  {traces.map((trace, index) => {
                    const config = stepTypeConfig[trace.stepType] || {
                      icon: Brain,
                      color: "text-gray-400",
                      label: trace.stepType,
                    };
                    const Icon = config.icon;
                    const isExpanded = expandedSteps.has(trace.stepNumber);
                    const confidence = trace.confidence ? parseFloat(trace.confidence) * 100 : null;
                    const isLowConfidence = confidence !== null && confidence < 70;
                    const approvalConfig = approvalStatusConfig[trace.approvalStatus];
                    const ApprovalIcon = approvalConfig.icon;

                    return (
                      <motion.div
                        key={trace.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        data-testid={`trace-step-${trace.stepNumber}`}
                      >
                        <div
                          className={`rounded-lg border transition-colors cursor-pointer ${
                            trace.approvalStatus === "pending" 
                              ? "bg-amber-900/20 border-amber-600/50 hover:border-amber-500" 
                              : isLowConfidence 
                                ? "bg-red-900/10 border-red-700/50 hover:border-red-600"
                                : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                          }`}
                          onClick={() => toggleStep(trace.stepNumber)}
                        >
                          <div className="p-3 flex items-start gap-3">
                            <div className="relative">
                              <div className={`p-2 rounded-full bg-gray-800 ${config.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              {index < traces.length - 1 && (
                                <div className="absolute top-10 left-1/2 w-px h-6 bg-gray-700 -translate-x-1/2" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`text-xs ${config.color} border-current`}>
                                    {config.label}
                                  </Badge>
                                  {confidence !== null && (
                                    <div className="flex items-center gap-1.5">
                                      <Progress 
                                        value={confidence} 
                                        className={`w-12 h-1.5 ${isLowConfidence ? '[&>div]:bg-red-500' : ''}`}
                                      />
                                      <span className={`text-xs font-medium ${
                                        confidence >= 70 ? 'text-green-400' : 
                                        confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                                      }`}>
                                        {confidence.toFixed(0)}%
                                      </span>
                                      {isLowConfidence && (
                                        <AlertTriangle className="w-3 h-3 text-red-400" />
                                      )}
                                    </div>
                                  )}
                                  {trace.approvalStatus !== "not_required" && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${approvalConfig.color} border-current`}
                                      data-testid={`approval-status-${trace.stepNumber}`}
                                    >
                                      <ApprovalIcon className="w-3 h-3 mr-1" />
                                      {approvalConfig.label}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {trace.durationMs && (
                                    <span className="text-xs text-gray-500">{trace.durationMs}ms</span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                              </div>

                              <p className="text-sm text-gray-200 truncate" data-testid={`trace-decision-${trace.stepNumber}`}>
                                {trace.decision}
                              </p>

                              {trace.approvalStatus === "pending" && (
                                <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveMutation.mutate(trace.id)}
                                    disabled={approveMutation.isPending}
                                    data-testid={`approve-btn-${trace.stepNumber}`}
                                  >
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectClick(trace.id)}
                                    disabled={rejectMutation.isPending}
                                    data-testid={`reject-btn-${trace.stepNumber}`}
                                  >
                                    <ShieldX className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3 space-y-3 overflow-hidden"
                                  >
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Reasoning</p>
                                      <p className="text-sm text-gray-300" data-testid={`trace-reasoning-${trace.stepNumber}`}>
                                        {trace.reasoning}
                                      </p>
                                    </div>

                                    {trace.rejectionReason && (
                                      <div className="bg-red-900/30 p-2 rounded">
                                        <p className="text-xs text-red-400 mb-1">Rejection Reason</p>
                                        <p className="text-sm text-red-300">{trace.rejectionReason}</p>
                                      </div>
                                    )}

                                    {trace.alternatives && Array.isArray(trace.alternatives) && trace.alternatives.length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Alternatives Considered</p>
                                        <div className="flex flex-wrap gap-1">
                                          {trace.alternatives.map((alt, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {String(alt)}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {trace.contextUsed && Object.keys(trace.contextUsed).length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Context Used</p>
                                        <pre className="text-xs bg-gray-900/50 p-2 rounded overflow-x-auto text-gray-400">
                                          {JSON.stringify(trace.contextUsed, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Decision</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting this decision. The agent run will be cancelled.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            data-testid="rejection-reason-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              data-testid="confirm-reject-btn"
            >
              Reject Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
