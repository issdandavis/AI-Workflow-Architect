import { useState, useRef, useEffect } from "react";
import Layout from "@/components/dashboard/Layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Code2, 
  Send,
  Copy,
  Check,
  Loader2,
  User,
  Bot,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GenerateResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
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

function extractCodeFromResponse(content: string): string {
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    return matches.map(m => m[1].trim()).join("\n\n");
  }
  
  return content;
}

export default function CodingStudio() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [provider, setProvider] = useState("openai");
  const [editorContent, setEditorContent] = useState("// Generated code will appear here\n// Select a provider and enter a prompt to get started\n");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest("POST", "/api/code-assistant/generate", {
        prompt,
        provider,
        conversationHistory,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate code");
      }

      return res.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      const code = extractCodeFromResponse(data.content);
      if (code) {
        setEditorContent(code);
      }

      if (data.usage) {
        toast({
          title: "Code generated",
          description: `Tokens used: ${data.usage.inputTokens} in, ${data.usage.outputTokens} out`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!inputValue.trim() || generateMutation.isPending) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    generateMutation.mutate(inputValue);
    setInputValue("");
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(editorContent);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setEditorContent("// Generated code will appear here\n// Select a provider and enter a prompt to get started\n");
    toast({
      title: "Chat cleared",
      description: "Conversation history has been reset",
    });
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Coding Assistant
              </h2>
              <p className="text-xs text-muted-foreground">Generate code with multiple AI providers</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={provider} onValueChange={setProvider} data-testid="select-provider">
                <SelectTrigger className="w-[160px]" data-testid="select-provider-trigger">
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
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearChat}
                className="h-9 w-9 p-0"
                data-testid="button-clear-chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 glass-panel rounded-xl p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground" data-testid="chat-empty-state">
                  <Bot className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Enter a prompt below to generate code</p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.id}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary/20 text-primary-foreground"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                        <span className="text-[10px] opacity-50 mt-1 block">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              {generateMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                  data-testid="loading-indicator"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-sm text-muted-foreground">
                      Generating with {selectedProvider?.name}...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="glass-panel p-3 rounded-xl">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Describe the code you want to generate..."
              className="min-h-[80px] bg-transparent border-none resize-none focus-visible:ring-0"
              data-testid="input-prompt"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </span>
              <Button 
                onClick={handleSubmit}
                disabled={!inputValue.trim() || generateMutation.isPending}
                className="gap-2"
                data-testid="button-submit"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Generate
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden border-primary/20">
          <div className="h-12 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Generated Code</span>
              {selectedProvider && (
                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded" data-testid="text-provider-name">
                  via {selectedProvider.name}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyCode}
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
          </div>

          <div className="flex-1" data-testid="monaco-editor-container">
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
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
