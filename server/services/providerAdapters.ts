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
    private apiKey: string | undefined,
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
}

export class AnthropicAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Anthropic", apiKey);
  }
}

export class XAIAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("xAI", apiKey);
  }
}

export class PerplexityAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Perplexity", apiKey);
  }
}

export class GeminiAdapter extends BaseProviderAdapter {
  constructor(apiKey: string | undefined) {
    super("Google Gemini", apiKey);
  }

  async call(prompt: string, model: string): Promise<ProviderResponse> {
    if (!process.env.GOOGLE_API_KEY) {
      return {
        success: false,
        error: "Google API key not configured. Please add GOOGLE_API_KEY in Secrets.",
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-pro"}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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
export function getProviderAdapter(provider: string): ProviderAdapter {
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    xai: process.env.XAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  };

  switch (provider.toLowerCase()) {
    case "openai":
      return new OpenAIAdapter(apiKeys.openai);
    case "anthropic":
      return new AnthropicAdapter(apiKeys.anthropic);
    case "xai":
      return new XAIAdapter(apiKeys.xai);
    case "perplexity":
      return new PerplexityAdapter(apiKeys.perplexity);
    case "google":
    case "gemini":
      return new GeminiAdapter(apiKeys.google);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
