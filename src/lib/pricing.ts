/**
 * OpenClaw Model Pricing — Mission Control
 * Adapted from TenacitOS (carlosazaustre)
 * Updated with our actual models (Opus 4.6, Sonnet 4.6, MiniMax M2.7, etc.)
 * All prices in USD per million tokens
 */

export interface ModelPricing {
  id: string;
  name: string;
  alias?: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  contextWindow: number;
}

export const MODEL_PRICING: ModelPricing[] = [
  // Anthropic models (our primary — subscription = $0 effective cost, but track token value)
  {
    id: "anthropic/claude-opus-4-6",
    name: "Opus 4.6",
    alias: "opus",
    inputPricePerMillion: 15.00,
    outputPricePerMillion: 75.00,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Sonnet 4.6",
    alias: "sonnet",
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Sonnet 4.5",
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Haiku 4.5",
    alias: "haiku",
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 4.00,
    contextWindow: 200000,
  },
  // Google Gemini models
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini Flash",
    alias: "gemini-flash",
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
    contextWindow: 1000000,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini Pro",
    alias: "gemini-pro",
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.00,
    contextWindow: 2000000,
  },
  // OpenAI
  {
    id: "openai/gpt-5.1-codex",
    name: "GPT 5.1",
    alias: "gpt",
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 8.00,
    contextWindow: 256000,
  },
  // MiniMax (our mechanical crons + heartbeats)
  {
    id: "minimax/MiniMax-M2.7",
    name: "MiniMax M2.7",
    alias: "minimax",
    inputPricePerMillion: 0.30,
    outputPricePerMillion: 1.10,
    contextWindow: 1000000,
  },
  // X.AI Grok
  {
    id: "x-ai/grok-4-1-fast",
    name: "Grok 4.1 Fast",
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 10.00,
    contextWindow: 128000,
  },
  // OpenAI Codex
  {
    id: "openai-codex/codex-mini-latest",
    name: "Codex Mini",
    alias: "codex",
    inputPricePerMillion: 1.50,
    outputPricePerMillion: 6.00,
    contextWindow: 192000,
  },
];

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const normalized = normalizeModelId(modelId);
  const pricing = MODEL_PRICING.find(
    (p) => p.id === normalized || p.alias === modelId || p.id === modelId
  );

  if (!pricing) {
    // Default to Sonnet pricing if unknown
    return (
      (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0
    );
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;

  return inputCost + outputCost;
}

/**
 * Get human-readable model name
 */
export function getModelName(modelId: string): string {
  const normalized = normalizeModelId(modelId);
  const pricing = MODEL_PRICING.find(
    (p) => p.id === normalized || p.alias === modelId || p.id === modelId
  );
  return pricing?.name || modelId;
}

/**
 * Format cost to string (e.g., "$0.42" or "<$0.01")
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return "<$0.01";
  if (cost < 1) return `$${cost.toFixed(2)}`;
  if (cost < 100) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(0)}`;
}

/**
 * Format token count (e.g., "1.2M", "45k", "892")
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

/**
 * Normalize model ID (handle aliases and different formats)
 */
export function normalizeModelId(modelId: string): string {
  const aliasMap: Record<string, string> = {
    // Short aliases
    opus: "anthropic/claude-opus-4-6",
    sonnet: "anthropic/claude-sonnet-4-6",
    haiku: "anthropic/claude-haiku-4-5",
    "gemini-flash": "google/gemini-2.5-flash",
    "gemini-pro": "google/gemini-2.5-pro",
    gpt: "openai/gpt-5.1-codex",
    minimax: "minimax/MiniMax-M2.7",
    codex: "openai-codex/codex-mini-latest",
    // OpenClaw format (without provider/)
    "claude-opus-4-6": "anthropic/claude-opus-4-6",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4-6",
    "claude-sonnet-4-5": "anthropic/claude-sonnet-4-5",
    "claude-haiku-4-5": "anthropic/claude-haiku-4-5",
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
    "gpt-5.1-codex": "openai/gpt-5.1-codex",
    "MiniMax-M2.7": "minimax/MiniMax-M2.7",
    "codex-mini-latest": "openai-codex/codex-mini-latest",
  };

  return aliasMap[modelId] || modelId;
}

/**
 * Get context window for a model
 */
export function getContextWindow(modelId: string): number {
  const normalized = normalizeModelId(modelId);
  const pricing = MODEL_PRICING.find(
    (p) => p.id === normalized || p.alias === modelId || p.id === modelId
  );
  return pricing?.contextWindow || 200000;
}
