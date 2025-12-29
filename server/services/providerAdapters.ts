// Provider adapters for multi-agent orchestration
// Returns safe stub responses when keys not configured

export interface ProviderResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costEstimate: string;
  };
}

export interface ProviderAdapter {
  name: string;
  call(prompt: string, model: string): Promise<ProviderResponse>;
}

// Base adapter with fallback behavior
class BaseProviderAdapter implements ProviderAdapter {
  constructor(
    public name: string,
    protected apiKey: string | undefined,
  ) {}

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: `${this.name} API key not configured. Please add the API key in Settings > API Keys.`,
      };
    }

    // Stub implementation - override in subclasses for real providers
    return {
      success: true,
      content: `[STUB] ${this.name} response to: ${prompt.substring(0, 50)}...`,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        costEstimate: "0.0001",
      },
    };
  }
}

export class OpenAIAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("OpenAI", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "OpenAI API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "OpenAI API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0003",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class AnthropicAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Anthropic", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Anthropic API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Anthropic API error",
        };
      }

      const content = data.content?.[0]?.text || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          costEstimate: "0.0004",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class XAIAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("xAI", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "xAI API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "grok-2",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "xAI API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0003",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class PerplexityAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Perplexity", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Perplexity API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "sonar",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Perplexity API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0002",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class GroqAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Groq", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Groq API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || "llama-3.1-70b-versatile",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Groq API error",
        };
      }

      const content = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          costEstimate: "0.0000", // Groq is free tier
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class HuggingFaceAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("HuggingFace", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    // HuggingFace Inference API is free without API key for some models
    const modelName = model || "microsoft/DialoGPT-medium";
    
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "HuggingFace API error",
        };
      }

      // Handle different response formats
      let content = "";
      if (Array.isArray(data) && data[0]?.generated_text) {
        content = data[0].generated_text.replace(prompt, "").trim();
      } else if (data.generated_text) {
        content = data.generated_text.replace(prompt, "").trim();
      } else {
        content = JSON.stringify(data);
      }

      return {
        success: true,
        content,
        usage: {
          inputTokens: prompt.length / 4, // Rough estimate
          outputTokens: content.length / 4,
          costEstimate: "0.0000", // Free tier
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export class FreeAdapter extends BaseProviderAdapter {
  constructor() {
    super("Free Demo", "demo-key");
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    // Always works - provides demo responses
    const responses = [
      "I'm a demo AI assistant! This is a free response to help you test the system. For full AI capabilities, please add your API keys in Settings.",
      "Hello! I'm running in demo mode. I can respond to basic queries, but for advanced AI features, you'll need to configure your API keys.",
      "This is a demonstration response. The AI Workflow Architect supports multiple providers like OpenAI, Anthropic, and more when configured with API keys.",
      "Demo mode active! I can help you explore the interface. To unlock full AI capabilities, visit Settings > API Keys to add your credentials.",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    // Add some context based on the prompt
    let contextualResponse = randomResponse;
    if (prompt.toLowerCase().includes("code")) {
      contextualResponse += "\n\nFor code generation and analysis, this platform works great with GPT-4, Claude, or other coding-focused models.";
    } else if (prompt.toLowerCase().includes("help")) {
      contextualResponse += "\n\nI can help you navigate the platform! Try exploring the Dashboard, Coding Studio, or AI Roundtable features.";
    }

    return {
      success: true,
      content: contextualResponse,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        costEstimate: "0.0000",
      },
    };
  }
}

export class GeminiAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Google Gemini", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "Google API key not configured. Please add the API key in Settings > API Keys.",
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Gemini API error",
        };
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      return {
        success: true,
        content,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
          costEstimate: "0.0001",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Factory to get the right adapter
// If apiKey is provided, use it; otherwise fall back to process.env
export function getProviderAdapter(provider: string, apiKey?: string): ProviderAdapter {
  const envApiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    xai: process.env.XAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    groq: process.env.GROQ_API_KEY,
    huggingface: process.env.HUGGINGFACE_API_KEY,
  };

  switch (provider.toLowerCase()) {
    case "openai":
      return new OpenAIAdapter(apiKey || envApiKeys.openai);
    case "anthropic":
      return new AnthropicAdapter(apiKey || envApiKeys.anthropic);
    case "xai":
      return new XAIAdapter(apiKey || envApiKeys.xai);
    case "perplexity":
      return new PerplexityAdapter(apiKey || envApiKeys.perplexity);
    case "google":
    case "gemini":
      return new GeminiAdapter(apiKey || envApiKeys.google);
    case "groq":
      return new GroqAdapter(apiKey || envApiKeys.groq);
    case "huggingface":
    case "hf":
      return new HuggingFaceAdapter(apiKey || envApiKeys.huggingface);
    case "free":
    case "demo":
      return new FreeAdapter();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
