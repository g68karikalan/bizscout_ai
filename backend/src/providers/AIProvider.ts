import { EnrichedLead } from '../types/index.js';

export interface AIAnalysisInput {
  business: EnrichedLead;
  serviceType: string;
  scoreBreakdown: Record<string, number>;
}

export interface AIAnalysisOutput {
  opportunitySummary: string;
  whyTheyNeedService: string;
  pitchAngle: string;
  recommendedFirstMessage: string;
}

export interface OutreachGenerationInput {
  business: EnrichedLead;
  serviceType: string;
  channel: string;
  tone: string;
  packageName?: string;
  packagePrice?: string;
  customOffer?: string;
}

/**
 * Provider abstraction for AI services.
 * Implement this interface to add OpenAI, Anthropic, Gemini, Ollama, etc.
 */
export interface AIProvider {
  readonly providerName: string;
  analyzeLead(input: AIAnalysisInput): Promise<AIAnalysisOutput>;
  generateOutreach(input: OutreachGenerationInput): Promise<string>;
}
