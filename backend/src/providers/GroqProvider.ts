import Groq from 'groq-sdk';
import {
  AIProvider,
  AIAnalysisInput,
  AIAnalysisOutput,
  OutreachGenerationInput,
} from './AIProvider.js';
import { ProviderError } from '../errors/AppError.js';

export class GroqProvider implements AIProvider {
  readonly providerName = 'groq';
  private readonly client: Groq;
  private readonly model = 'qwen/qwen3.8-27b';

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async analyzeLead(input: AIAnalysisInput): Promise<AIAnalysisOutput> {
    const { business, serviceType, scoreBreakdown } = input;

    const prompt = `You are a business development analyst. Analyze this local business as a potential client for ${serviceType} services.

Business: ${business.name}
Category: ${business.category}
Location: ${business.city}, ${business.state}, ${business.country}
Website: ${business.website || 'None'}
Instagram: ${business.instagramUrl || 'Not found'}
Facebook: ${business.facebookUrl || 'Not found'}
Phone: ${business.phone || 'Not found'}
Email: ${business.email || 'Not found'}
Rating: ${business.rating || 'Unknown'} (${business.reviewCount || 0} reviews)

Score Breakdown: ${JSON.stringify(scoreBreakdown, null, 2)}

IMPORTANT RULES:
- Do NOT invent contact details, revenue, employees, or owner names
- Only reference publicly visible information above
- Keep responses concise and practical

Respond with a JSON object with these exact keys:
{
  "opportunitySummary": "1-2 sentence summary of why this is a good lead",
  "whyTheyNeedService": "1-2 sentences explaining their specific gap/need",
  "pitchAngle": "Specific angle to use when approaching them",
  "recommendedFirstMessage": "A natural first message opener (not a full pitch)"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new ProviderError('Groq', 'Empty response from AI');

      const parsed = JSON.parse(content) as AIAnalysisOutput;
      return parsed;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ProviderError('Groq', msg);
    }
  }

  async generateOutreach(input: OutreachGenerationInput): Promise<string> {
    const { business, serviceType, channel, tone, packageName, packagePrice, customOffer } = input;

    const offer = customOffer || (packageName ? `${packageName}${packagePrice ? ` at ${packagePrice}` : ''}` : serviceType);

    const channelInstructions: Record<string, string> = {
      whatsapp: 'Write a casual WhatsApp message (max 150 words). Start naturally, not with "Hello I am..."',
      instagram_dm: 'Write a short Instagram DM (max 100 words). Friendly, personal tone.',
      email: 'Write a professional cold email with subject line and body (max 200 words).',
      call_script: 'Write a call script with opening, value proposition, and call to action (max 200 words).',
    };

    const toneMap: Record<string, string> = {
      professional: 'formal and professional',
      friendly: 'warm and conversational',
      short: 'very brief and to-the-point',
      sales_focused: 'persuasive with clear benefits',
      formal: 'formal business tone',
    };

    const prompt = `Write a ${channel.replace('_', ' ')} outreach message for a local business.

Business: ${business.name} (${business.category}) in ${business.city}
Service: ${serviceType}
Offer: ${offer}
Tone: ${toneMap[tone] || tone}

${channelInstructions[channel] || 'Write a professional outreach message.'}

RULES:
- Do NOT make up specific data about their business
- Be specific to their business type and location
- Make it feel personal, not templated
- Do NOT include placeholder text like [YOUR NAME] - use "I" naturally

Write only the message content, no explanation.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new ProviderError('Groq', 'Empty response from AI');
      return content.trim();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ProviderError('Groq', msg);
    }
  }
}
