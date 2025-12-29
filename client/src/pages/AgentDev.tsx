import { useState } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileCode,
  Search,
  Sparkles,
  Loader2,
  Code2,
  Lightbulb,
  Copy,
  Check,
  FileText,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";

interface AnalysisResult {
  filePath: string;
  content: string;
  lines: number;
  size: number;
  analysisId: number;
}

interface Suggestion {
  title: string;
  description: string;
  codeBlock?: string;
}

interface SuggestResponse {
  suggestions: Suggestion[];
  provider: string;
  analysisId: number;
  suggestionId: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface Proposal {
  id: number;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "applied";
  createdAt: string;
}

const PROVIDERS = [
  { id: "free", name: "Free Demo", model: "demo" },
  { id: "groq", name: "Groq (Free)", model: "llama-3.1-70b-versatile" },
  { id: "huggingface", name: "HuggingFace (Free)", model: "microsoft/DialoGPT-medium" },
  { id: "openai", name: "OpenAI", model: "gpt-4o" },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-4-20250514" },
  { id: "xai", name: "xAI (Grok)", model: "grok-2" },
  { id: "perplexity", name: "Perplexity", model: "sonar" },
  { id: "google", name: "Google Gemini", model: "gemini-2.0-flash" },
];

export default function AgentDev() {
  const [filePath, setFilePath] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [provider, setProvider] = useState("openai");
  const [prompt, setPrompt] = useState("Review this code and suggest improvements for better performance, readability, and maintainability.");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionId, setSuggestionId] = useState<number | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const proposalsQuery = useQuery({
    queryKey: ["agent-dev-proposals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agent-dev/proposals");
      if (!res.ok) throw new Error("Failed to fetch proposals");
      return res.json() as Promise<Proposal[]>;
    },
    refetchInterval: 10000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await apiRequest("GET", `/api/agent-dev/analyze?filePath=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to analyze file");
      }
      return res.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setEditorContent(data.content);
      setSuggestions([]);
      setSuggestionId(null);
      toast({
        title: "File analyzed",
        description: `${data.lines} lines, ${(data.size / 1024).toFixed(2)} KB`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      if (!analysis) throw new Error("No file analyzed");
      
      const res = await apiRequest("POST", "/api/agent-dev/suggest", {
        filePath: analysis.filePath,
        content: editorContent,
        prompt,
        provider,
        analysisId: analysis.analysisId,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get suggestions");
      }
      return res.json() as Promise<SuggestResponse>;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
      setSuggestionId(data.suggestionId);
      setShowSuggestionsModal(true);
      toast({
        title: "Suggestions received",
        description: `${data.suggestions.length} suggestions from ${data.provider}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Suggestions failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async ({ originalContent, proposedContent, description }: { 
      originalContent: string; 
      proposedContent: string; 
      description: string;
    }) => {
      if (!analysis) throw new Error("No file analyzed");
      
      const res = await apiRequest("POST", "/api/agent-dev/apply", {
        filePath: analysis.filePath,
        originalContent,
        proposedContent,
        description,
        suggestionId: suggestionId || undefined,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to apply changes");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Proposal created",
        description: data.message,
      });
      setShowSuggestionsModal(false);
      setShowApplyConfirm(false);
      setSelectedSuggestion(null);
      queryClient.invalidateQueries({ queryKey: ["agent-dev-proposals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Apply failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (proposalId: number) => {
      const res = await apiRequest("POST", `/api/agent-dev/proposals/${proposalId}/approve`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve proposal");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Proposal approved",
        description: "Changes have been applied to the file",
      });
      queryClient.invalidateQueries({ queryKey: ["agent-dev-proposals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (proposalId: number) => {
      const res = await apiRequest("POST", `/api/agent-dev/proposals/${proposalId}/reject`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject proposal");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Proposal rejected",
        description: "The proposed changes have been discarded",
      });
      queryClient.invalidateQueries({ queryKey: ["agent-dev-proposals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!filePath.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file path",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(filePath);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    if (suggestion.codeBlock && analysis) {
      setSelectedSuggestion(suggestion);
      setShowApplyConfirm(true);
    }
  };

  const confirmApplySuggestion = () => {
    if (selectedSuggestion?.codeBlock && analysis) {
      applyMutation.mutate({
        originalContent: analysis.content,
        proposedContent: selectedSuggestion.codeBlock,
        description: `Applied suggestion: ${selectedSuggestion.title}`,
      });
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider);
  const pendingProposals = proposalsQuery.data?.filter(p => p.status === "pending") || [];

  return (
    <Layout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-140px)]">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="analysis" className="gap-2" data-testid="tab-analysis">
              <FileCode className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="proposals" className="gap-2" data-testid="tab-proposals">
              <ClipboardList className="w-4 h-4" />
              Proposals
              {pendingProposals.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {pendingProposals.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analysis" className="h-full mt-0">
          <div className="h-full flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-2/5 flex flex-col gap-4">
              <div className="glass-panel p-4 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-page-title">
                      <FileCode className="w-5 h-5 text-primary" />
                      Agentic Development
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Analyze code files and get AI-powered suggestions
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="Enter file path (e.g., server/routes.ts)"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAnalyze();
                    }}
                    data-testid="input-file-path"
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending}
                    data-testid="button-analyze"
                  >
                    {analyzeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="ml-2">Analyze</span>
                  </Button>
                </div>

                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-white/5 rounded-lg"
                    data-testid="analysis-result"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {analysis.filePath}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div data-testid="text-lines-count">Lines: {analysis.lines}</div>
                      <div data-testid="text-file-size">Size: {(analysis.size / 1024).toFixed(2)} KB</div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Code Review
                  </h3>
                  <Select value={provider} onValueChange={setProvider} data-testid="select-provider">
                    <SelectTrigger className="w-[140px]" data-testid="select-provider-trigger">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id} data-testid={`select-provider-${p.id}`}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What would you like the AI to review or improve?"
                  className="flex-1 min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-0"
                  data-testid="input-prompt"
                />

                <Button
                  onClick={() => suggestMutation.mutate()}
                  disabled={!analysis || suggestMutation.isPending}
                  className="mt-4 w-full gap-2"
                  data-testid="button-get-suggestions"
                >
                  {suggestMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting suggestions from {selectedProvider?.name}...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4" />
                      Get AI Suggestions
                    </>
                  )}
                </Button>

                {suggestions.length > 0 && !showSuggestionsModal && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSuggestionsModal(true)}
                    className="mt-2 w-full gap-2"
                    data-testid="button-view-suggestions"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    View {suggestions.length} Suggestions
                  </Button>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="glass-panel p-4 rounded-xl">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Latest Suggestions ({suggestions.length})
                  </h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => {
                          setSelectedSuggestion(suggestion);
                          setShowSuggestionsModal(true);
                        }}
                        data-testid={`inline-suggestion-${index}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs text-primary">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium truncate">{suggestion.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden border-primary/20">
              <div className="h-12 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm" data-testid="text-editor-title">
                    {analysis ? analysis.filePath : "No file loaded"}
                  </span>
                </div>
                {analysis && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyCode(editorContent)}
                    className="gap-2 h-8"
                    data-testid="button-copy-code"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex-1" data-testid="monaco-editor-container">
                {analysis ? (
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    theme="vs-dark"
                    value={editorContent}
                    onChange={(value) => setEditorContent(value || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: "on",
                      padding: { top: 16 },
                      readOnly: false,
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground" data-testid="editor-empty-state">
                    <FileCode className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-sm">No file loaded</p>
                    <p className="text-xs mt-1">Enter a file path and click Analyze to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="h-full mt-0">
          <div className="h-full flex flex-col">
            <div className="glass-panel p-4 rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Pending Proposals
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["agent-dev-proposals"] })}
                  disabled={proposalsQuery.isFetching}
                  data-testid="button-refresh-proposals"
                >
                  {proposalsQuery.isFetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {proposalsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : pendingProposals.length === 0 ? (
                <div className="glass-panel rounded-xl p-8 text-center" data-testid="no-pending-proposals">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No pending proposals to review</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apply suggestions from the Analysis tab to create proposals
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onApprove={() => approveMutation.mutate(proposal.id)}
                      onReject={() => rejectMutation.mutate(proposal.id)}
                      isProcessing={approveMutation.isPending || rejectMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showSuggestionsModal} onOpenChange={setShowSuggestionsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              AI Suggestions
            </DialogTitle>
            <DialogDescription>
              {suggestions.length} improvement suggestions from {selectedProvider?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <AnimatePresence>
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-white/5 rounded-lg border border-white/10"
                    data-testid={`suggestion-card-${index}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2" data-testid={`suggestion-title-${index}`}>
                        <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs text-primary">
                          {index + 1}
                        </span>
                        {suggestion.title}
                      </h4>
                      {suggestion.codeBlock && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyCode(suggestion.codeBlock!)}
                            className="h-7 px-2"
                            data-testid={`button-copy-suggestion-${index}`}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplySuggestion(suggestion)}
                            disabled={applyMutation.isPending}
                            className="h-7"
                            data-testid={`button-apply-suggestion-${index}`}
                          >
                            {applyMutation.isPending && selectedSuggestion === suggestion ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span className="ml-1">Apply</span>
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3" data-testid={`suggestion-description-${index}`}>
                      {suggestion.description}
                    </p>
                    {suggestion.codeBlock && (
                      <div className="bg-black/30 rounded-md p-3 overflow-x-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap" data-testid={`suggestion-code-${index}`}>
                          {suggestion.codeBlock}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {suggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No suggestions available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a proposal to apply "{selectedSuggestion?.title}" to {analysis?.filePath}.
              The proposal will need to be approved before changes are applied to the file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-apply">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApplySuggestion}
              disabled={applyMutation.isPending}
              data-testid="button-confirm-apply"
            >
              {applyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create Proposal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function ProposalCard({ 
  proposal, 
  onApprove, 
  onReject,
  isProcessing 
}: { 
  proposal: Proposal; 
  onApprove: () => void; 
  onReject: () => void;
  isProcessing: boolean;
}) {
  const [showDiff, setShowDiff] = useState(true);

  const oldLines = proposal.originalContent.split("\n");
  const newLines = proposal.proposedContent.split("\n");

  const diffLines: Array<{ type: "context" | "add" | "remove"; content: string; oldNum?: number; newNum?: number }> = [];
  let additions = 0;
  let deletions = 0;

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldLine === newLine) {
      diffLines.push({ type: "context", content: oldLine || "", oldNum: oldIdx + 1, newNum: newIdx + 1 });
      oldIdx++;
      newIdx++;
    } else if (oldIdx < oldLines.length && (newIdx >= newLines.length || oldLine !== newLines[newIdx])) {
      diffLines.push({ type: "remove", content: oldLine, oldNum: oldIdx + 1 });
      deletions++;
      oldIdx++;
    } else {
      diffLines.push({ type: "add", content: newLine, newNum: newIdx + 1 });
      additions++;
      newIdx++;
    }
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden" data-testid={`proposal-card-${proposal.id}`}>
      <div className="p-4 border-b border-white/5 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-primary" />
            <span className="font-semibold">{proposal.description}</span>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-400 border-amber-500/20"
              data-testid={`status-${proposal.id}`}
            >
              {proposal.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={onReject}
              disabled={isProcessing}
              data-testid={`button-reject-${proposal.id}`}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-500 text-white"
              onClick={onApprove}
              disabled={isProcessing}
              data-testid={`button-approve-${proposal.id}`}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve & Apply
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-mono text-xs">{proposal.filePath}</span>
          <span className="text-green-400">+{additions}</span>
          <span className="text-red-400">-{deletions}</span>
          <span className="text-xs">{new Date(proposal.createdAt).toLocaleString()}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDiff(!showDiff)}
            className="ml-auto h-6 px-2 text-xs"
            data-testid={`toggle-diff-${proposal.id}`}
          >
            {showDiff ? "Hide Diff" : "Show Diff"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showDiff && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-[400px]">
              <div className="bg-[#0d1117] font-mono text-xs">
                <div className="px-4 py-1 bg-blue-500/10 text-blue-300 border-y border-blue-500/20">
                  @@ -{oldLines.length > 0 ? 1 : 0},{oldLines.length} +{newLines.length > 0 ? 1 : 0},{newLines.length} @@
                </div>
                {diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      line.type === "add"
                        ? "bg-green-500/10"
                        : line.type === "remove"
                        ? "bg-red-500/10"
                        : ""
                    }`}
                  >
                    <div className="w-10 px-2 text-right text-gray-600 select-none border-r border-white/5">
                      {line.oldNum || ""}
                    </div>
                    <div className="w-10 px-2 text-right text-gray-600 select-none border-r border-white/5">
                      {line.newNum || ""}
                    </div>
                    <div className="w-6 flex items-center justify-center">
                      {line.type === "add" && <Plus className="w-3 h-3 text-green-400" />}
                      {line.type === "remove" && <Minus className="w-3 h-3 text-red-400" />}
                    </div>
                    <div
                      className={`flex-1 px-2 ${
                        line.type === "add"
                          ? "text-green-300"
                          : line.type === "remove"
                          ? "text-red-300"
                          : "text-gray-400"
                      }`}
                    >
                      {line.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
