/**
 * Config resolution for openclaw-mind.
 *
 * Priority (highest first):
 *   1. Plugin config (passed by OpenClaw from openclaw-mind.yaml)
 *   2. Environment variables (MIND_API_KEY, MIND_BASE_URL)
 *   3. Defaults
 */

export const DEFAULT_BASE_URL = "https://www.m-i-n-d.ai";
export const DEFAULT_TOP_K = 10;
export const DEFAULT_SEARCH_THRESHOLD = 0.5;
export const DEFAULT_QUERY_MODE = "hybrid" as const;

export type QueryMode = "hybrid" | "mix" | "global" | "local" | "naive";

export interface SkillsConfig {
  triage?: {
    enabled?: boolean;
    importanceThreshold?: number;
    credentialPatterns?: string[];
  };
  recall?: {
    enabled?: boolean;
    strategy?: "always" | "smart" | "manual";
    tokenBudget?: number;
    maxMemories?: number;
  };
  dream?: {
    enabled?: boolean;
    auto?: boolean;
    minHours?: number;
    minSessions?: number;
  };
  emotionalEncoding?: {
    enabled?: boolean;
    minValence?: number;
    minArousal?: number;
  };
}

export interface MindPluginConfig {
  apiKey?: string;
  baseUrl: string;
  userId?: string;
  autoCapture: boolean;
  autoRecall: boolean;
  topK: number;
  searchThreshold: number;
  queryMode: QueryMode;
  enableMindsense: boolean;
  enableLifeIntegration: boolean;
  enableCrmLogging: boolean;
  skills?: SkillsConfig;
  needsSetup: boolean;
}

export interface RawPluginConfig {
  apiKey?: string;
  baseUrl?: string;
  userId?: string;
  autoCapture?: boolean;
  autoRecall?: boolean;
  topK?: number;
  searchThreshold?: number;
  queryMode?: QueryMode;
  enableMindsense?: boolean;
  enableLifeIntegration?: boolean;
  enableCrmLogging?: boolean;
  skills?: SkillsConfig;
}

export function resolveConfig(raw: RawPluginConfig | undefined): MindPluginConfig {
  const apiKey =
    raw?.apiKey ?? process.env.MIND_API_KEY ?? process.env.MINDAPP_API_KEY;
  const baseUrl =
    raw?.baseUrl ?? process.env.MIND_BASE_URL ?? DEFAULT_BASE_URL;

  return {
    apiKey,
    baseUrl,
    userId: raw?.userId ?? process.env.MIND_USER_ID,
    autoCapture: raw?.autoCapture ?? true,
    autoRecall: raw?.autoRecall ?? true,
    topK: raw?.topK ?? DEFAULT_TOP_K,
    searchThreshold: raw?.searchThreshold ?? DEFAULT_SEARCH_THRESHOLD,
    queryMode: raw?.queryMode ?? DEFAULT_QUERY_MODE,
    enableMindsense: raw?.enableMindsense ?? true,
    enableLifeIntegration: raw?.enableLifeIntegration ?? true,
    enableCrmLogging: raw?.enableCrmLogging ?? true,
    skills: raw?.skills,
    needsSetup: !apiKey,
  };
}
