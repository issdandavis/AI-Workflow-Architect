import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseAssistantReturn {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  pageContext: string;
  clearMessages: () => void;
}

function getPageContext(pathname: string): string {
  const contextMap: Record<string, string> = {
    "/": "home",
    "/dashboard": "dashboard",
    "/studio": "studio",
    "/agents": "agents",
    "/integrations": "integrations",
    "/settings": "settings",
    "/storage": "storage",
    "/shop": "shop",
    "/login": "login",
    "/signup": "signup",
  };
  return contextMap[pathname] || "unknown";
}

export function useAssistant(): UseAssistantReturn {
  const [location] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageContext = useMemo(() => getPageContext(location), [location]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: content.trim(),
          context: pageContext,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || "I apologize, but I couldn't process your request.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [messages, pageContext]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    pageContext,
    clearMessages,
  };
}
