import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUserId } from '../middleware/auth.js';
import { successResponse } from '../errors/errorHandler.js';
import { NotFoundError, ProviderError } from '../errors/AppError.js';
import { getLeadById, recordActivity } from '../services/leadService.js';
import { GroqProvider } from '../providers/GroqProvider.js';
import { env, isMockMode } from '../config/env.js';
import { AIProvider } from '../providers/AIProvider.js';

function getAIProvider(): AIProvider | null {
  if (isMockMode || !env.GROQ_API_KEY) return null;
  return new GroqProvider(env.GROQ_API_KEY);
}

const outreachSchema = z.object({
  channel: z.enum(['whatsapp', 'instagram_dm', 'email', 'call_script']),
  tone: z.enum(['professional', 'friendly', 'short', 'sales_focused', 'formal']),
  serviceType: z.string().min(1),
  packageName: z.string().optional(),
  packagePrice: z.string().optional(),
  customOffer: z.string().optional(),
});

// Mock outreach messages for dev mode
function getMockOutreach(
  businessName: string,
  category: string,
  city: string,
  channel: string,
  tone: string,
  serviceType: string
): string {
  const channelMessages: Record<string, string> = {
    whatsapp: `Hi! I came across ${businessName} and really loved what you're doing for the ${category} industry in ${city}. I help local businesses like yours get more customers through ${serviceType.replace(/_/g, ' ')}. Would love to share how I've helped similar businesses grow. Open to a quick chat? 🙏`,
    instagram_dm: `Hey ${businessName}! 👋 Noticed your business in ${city} — I work with ${category} businesses on ${serviceType.replace(/_/g, ' ')} and think there's a great opportunity here. DM me back if you'd like to know more!`,
    email: `Subject: Helping ${businessName} attract more customers in ${city}\n\nHi there,\n\nI came across ${businessName} and was impressed by your ${category} business. I specialize in ${serviceType.replace(/_/g, ' ')} for local businesses in ${city} and have helped similar businesses grow their customer base.\n\nI'd love to share some specific ideas for your business — would a 15-minute call work this week?\n\nBest regards`,
    call_script: `Opening: "Hi, is this ${businessName}? Great! I'm calling because I help local ${category} businesses in ${city} with ${serviceType.replace(/_/g, ' ')}.\n\nValue Prop: I've worked with similar businesses and helped them [increase visibility/get more customers/improve their online presence].\n\nCTA: Would it be okay if I sent you some examples of my work? Or is there a better time to connect this week?\n\nClosing: Thanks for your time! I'll send you a quick message with more details."`,
  };

  return channelMessages[channel] || channelMessages['whatsapp'];
}

export async function aiRoutes(fastify: FastifyInstance) {
  // POST /leads/:id/analyze & POST /api/leads/:id/analyze
  const handleAnalyzeLead = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const lead = getLeadById(userId, id);
    if (!lead) throw new NotFoundError('Lead');

    const body = z.object({ serviceType: z.string().min(1) }).parse(request.body);

    const aiProvider = getAIProvider();
    if (!aiProvider) {
      // Return mock analysis
      return reply.send(
        successResponse({
          analysis: {
            opportunitySummary: lead.opportunitySummary || 'Good local business opportunity with potential for digital marketing growth.',
            whyTheyNeedService: `${lead.name} operates as a ${lead.category} in ${lead.city} and could benefit significantly from professional ${body.serviceType.replace(/_/g, ' ')} services to expand their customer reach.`,
            pitchAngle: `Focus on how ${body.serviceType.replace(/_/g, ' ')} has helped similar ${lead.category} businesses attract more local customers.`,
            recommendedFirstMessage: `Hi! I noticed ${lead.name} and have some ideas that could help you reach more customers in ${lead.city}.`,
          },
          source: 'deterministic',
        })
      );
    }

    try {
      const analysis = await aiProvider.analyzeLead({
        business: lead as any,
        serviceType: body.serviceType,
        scoreBreakdown: (lead.scoreBreakdown as Record<string, number>) || {},
      });

      return reply.send(successResponse({ analysis, source: 'ai' }));
    } catch (error) {
      // Fallback to deterministic
      return reply.send(
        successResponse({
          analysis: {
            opportunitySummary: lead.opportunitySummary || 'Business opportunity identified.',
            whyTheyNeedService: `${lead.name} could benefit from ${body.serviceType.replace(/_/g, ' ')} services.`,
            pitchAngle: 'Highlight ROI and local success stories.',
            recommendedFirstMessage: `Hi! I have some ideas for ${lead.name} that could help you grow.`,
          },
          source: 'fallback',
          error: error instanceof Error ? error.message : 'AI unavailable',
        })
      );
    }
  };
  fastify.post('/leads/:id/analyze', { preHandler: authenticate }, handleAnalyzeLead);
  fastify.post('/api/leads/:id/analyze', { preHandler: authenticate }, handleAnalyzeLead);

  // POST /leads/:id/outreach & POST /api/leads/:id/outreach
  const handleGenerateOutreach = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const lead = getLeadById(userId, id);
    if (!lead) throw new NotFoundError('Lead');

    const body = outreachSchema.parse(request.body);

    const aiProvider = getAIProvider();
    if (!aiProvider) {
      const message = getMockOutreach(
        lead.name,
        lead.category,
        lead.city || '',
        body.channel,
        body.tone,
        body.serviceType
      );
      recordActivity(userId, 'outreach_generated', lead.id, { channel: body.channel });
      return reply.send(successResponse({ message, source: 'template' }));
    }

    try {
      const message = await aiProvider.generateOutreach({
        business: lead as any,
        ...body,
      });
      recordActivity(userId, 'outreach_generated', lead.id, { channel: body.channel });
      return reply.send(successResponse({ message, source: 'ai' }));
    } catch (error) {
      const message = getMockOutreach(
        lead.name,
        lead.category,
        lead.city || '',
        body.channel,
        body.tone,
        body.serviceType
      );
      recordActivity(userId, 'outreach_generated', lead.id, { channel: body.channel });
      return reply.send(
        successResponse({
          message,
          source: 'fallback',
          error: error instanceof Error ? error.message : 'AI unavailable',
        })
      );
    }
  };
  fastify.post('/leads/:id/outreach', { preHandler: authenticate }, handleGenerateOutreach);
  fastify.post('/api/leads/:id/outreach', { preHandler: authenticate }, handleGenerateOutreach);
}
