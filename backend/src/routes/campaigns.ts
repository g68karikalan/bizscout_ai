import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, getUserId } from '../middleware/auth.js';
import { successResponse } from '../errors/errorHandler.js';
import { getUserLeads, recordActivity } from '../services/leadService.js';
import { NotFoundError } from '../errors/AppError.js';

// In-memory campaign store
const CAMPAIGNS: Map<string, any[]> = new Map(); // userId -> campaigns[]

export async function campaignRoutes(fastify: FastifyInstance) {
  const campaignSchema = z.object({
    name: z.string().min(2).max(100),
    serviceType: z.string().min(1),
    targetCategory: z.string().optional(),
    targetLocation: z.string().optional(),
    offerName: z.string().optional(),
    offerPrice: z.number().positive().optional(),
    status: z.enum(['active', 'paused', 'completed']).default('active'),
  });

  // POST /campaigns & POST /api/campaigns
  const handleCreateCampaign = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const body = campaignSchema.parse(request.body);

    const campaign = {
      id: uuidv4(),
      userId,
      ...body,
      leadIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userCampaigns = CAMPAIGNS.get(userId) || [];
    userCampaigns.push(campaign);
    CAMPAIGNS.set(userId, userCampaigns);

    recordActivity(userId, 'campaign_created', undefined, {
      name: campaign.name,
      campaignId: campaign.id,
    });

    return reply.status(201).send(successResponse({ campaign }));
  };
  fastify.post('/campaigns', { preHandler: authenticate }, handleCreateCampaign);
  fastify.post('/api/campaigns', { preHandler: authenticate }, handleCreateCampaign);

  // GET /campaigns & GET /api/campaigns
  const handleGetCampaigns = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const campaigns = CAMPAIGNS.get(userId) || [];

    // Enrich with stats
    const userLeads = getUserLeads(userId);
    const enriched = campaigns.map((c) => {
      const campaignLeads = userLeads.filter((l) => c.leadIds?.includes(l.id));
      const contacted = campaignLeads.filter((l) =>
        ['contacted', 'follow_up', 'replied', 'qualified', 'won'].includes(l.status)
      ).length;
      const replied = campaignLeads.filter((l) =>
        ['replied', 'qualified', 'won'].includes(l.status)
      ).length;
      const won = campaignLeads.filter((l) => l.status === 'won').length;

      return {
        ...c,
        stats: {
          totalLeads: campaignLeads.length,
          contacted,
          replied,
          won,
          responseRate: contacted > 0 ? Math.round((replied / contacted) * 100) : 0,
          conversionRate: contacted > 0 ? Math.round((won / contacted) * 100) : 0,
        },
      };
    });

    return reply.send(successResponse({ campaigns: enriched }));
  };
  fastify.get('/campaigns', { preHandler: authenticate }, handleGetCampaigns);
  fastify.get('/api/campaigns', { preHandler: authenticate }, handleGetCampaigns);

  // GET /campaigns/:id & GET /api/campaigns/:id
  const handleGetCampaignById = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const campaigns = CAMPAIGNS.get(userId) || [];
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) throw new NotFoundError('Campaign');

    const userLeads = getUserLeads(userId);
    const campaignLeads = userLeads.filter((l) => campaign.leadIds?.includes(l.id));

    return reply.send(successResponse({ campaign: { ...campaign, leads: campaignLeads } }));
  };
  fastify.get('/campaigns/:id', { preHandler: authenticate }, handleGetCampaignById);
  fastify.get('/api/campaigns/:id', { preHandler: authenticate }, handleGetCampaignById);

  // PATCH /campaigns/:id & PATCH /api/campaigns/:id
  const handleUpdateCampaign = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const body = campaignSchema.partial().parse(request.body);

    const campaigns = CAMPAIGNS.get(userId) || [];
    const idx = campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new NotFoundError('Campaign');

    campaigns[idx] = { ...campaigns[idx], ...body, updatedAt: new Date().toISOString() };
    return reply.send(successResponse({ campaign: campaigns[idx] }));
  };
  fastify.patch('/campaigns/:id', { preHandler: authenticate }, handleUpdateCampaign);
  fastify.patch('/api/campaigns/:id', { preHandler: authenticate }, handleUpdateCampaign);

  // DELETE /campaigns/:id & DELETE /api/campaigns/:id
  const handleDeleteCampaign = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const campaigns = CAMPAIGNS.get(userId) || [];
    const idx = campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new NotFoundError('Campaign');

    campaigns.splice(idx, 1);
    return reply.send(successResponse({ message: 'Campaign deleted' }));
  };
  fastify.delete('/campaigns/:id', { preHandler: authenticate }, handleDeleteCampaign);
  fastify.delete('/api/campaigns/:id', { preHandler: authenticate }, handleDeleteCampaign);

  // POST /campaigns/:id/leads & POST /api/campaigns/:id/leads
  const handleAddLeadsToCampaign = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const body = z.object({ leadIds: z.array(z.string()).min(1) }).parse(request.body);

    const campaigns = CAMPAIGNS.get(userId) || [];
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) throw new NotFoundError('Campaign');

    // Only allow adding leads that belong to this user
    const userLeads = getUserLeads(userId);
    const validLeadIds = body.leadIds.filter((lid) => userLeads.some((l) => l.id === lid));

    campaign.leadIds = [...new Set([...(campaign.leadIds || []), ...validLeadIds])];
    return reply.send(successResponse({ campaign, addedCount: validLeadIds.length }));
  };
  fastify.post('/campaigns/:id/leads', { preHandler: authenticate }, handleAddLeadsToCampaign);
  fastify.post('/api/campaigns/:id/leads', { preHandler: authenticate }, handleAddLeadsToCampaign);
}
