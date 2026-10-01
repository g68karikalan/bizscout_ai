import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUserId } from '../middleware/auth.js';
import {
  getUserLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  createSearchJob,
  startSearchJob,
  getSearchJob,
  getUserSearchJobs,
  getUserActivities,
  getDashboardStats,
} from '../services/leadService.js';
import { successResponse } from '../errors/errorHandler.js';
import { NotFoundError } from '../errors/AppError.js';
import { LeadStatus } from '../types/index.js';

const searchSchema = z.object({
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required').default('India'),
  category: z.string().min(1, 'Category is required'),
  limit: z.number().int().min(1).max(100).default(10),
  serviceType: z.string().default('social_media_design'),
  filters: z
    .object({
      minRating: z.number().min(0).max(5).optional(),
      minReviews: z.number().min(0).optional(),
      hasPhone: z.boolean().optional(),
      hasWebsite: z.boolean().optional(),
      onlyOpen: z.boolean().optional(),
    })
    .optional(),
});

const createLeadSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  whatsappUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  status: LeadStatus.default('new'),
  notes: z.string().max(5000).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  serviceType: z.string().default('social_media_design'),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  whatsappUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  status: LeadStatus.optional(),
  notes: z.string().max(5000).optional(),
});

const leadsQuerySchema = z.object({
  page: z.string().optional().transform((v) => parseInt(v || '1', 10)),
  limit: z.string().optional().transform((v) => Math.min(parseInt(v || '25', 10), 100)),
  status: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  minScore: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export async function leadsRoutes(fastify: FastifyInstance) {
  // ── Dashboard Stats ─────────────────────────────────────────────────────────
  const handleGetStats = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const stats = getDashboardStats(userId);
    return reply.send(successResponse(stats));
  };
  fastify.get('/dashboard/stats', { preHandler: authenticate }, handleGetStats);
  fastify.get('/api/dashboard/stats', { preHandler: authenticate }, handleGetStats);

  // ── Search Jobs ─────────────────────────────────────────────────────────────
  const handleStartSearch = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const body = searchSchema.parse(request.body);

    const jobId = createSearchJob(userId, body.city, body.category, body.limit);
    startSearchJob(
      jobId,
      userId,
      {
        city: body.city,
        state: body.state,
        country: body.country,
        category: body.category,
        limit: body.limit,
        filters: body.filters,
      },
      body.serviceType
    );

    return reply.status(202).send(successResponse({ jobId }));
  };
  fastify.post('/leads/search', { preHandler: authenticate }, handleStartSearch);
  fastify.post('/api/search', { preHandler: authenticate }, handleStartSearch);

  const handleGetSearchJob = async (request: any, reply: any) => {
    const { id, jobId } = request.params as { id?: string; jobId?: string };
    const targetId = jobId || id;
    if (!targetId) throw new NotFoundError('Search job');

    const job = getSearchJob(targetId);
    if (!job) throw new NotFoundError('Search job');

    const userId = getUserId(request);
    // User can only see results belonging to them
    const results = job.status === 'completed'
      ? job.results.filter((r) => r.userId === userId)
      : [];

    return reply.send(
      successResponse({
        id: job.id,
        status: job.status,
        stage: job.stage,
        resultsCount: results.length,
        results,
        error: job.error,
        completedAt: job.completedAt,
      })
    );
  };
  fastify.get('/search-jobs/:id', { preHandler: authenticate }, handleGetSearchJob);
  fastify.get('/api/search/:jobId', { preHandler: authenticate }, handleGetSearchJob);

  // GET /search-jobs/:id/results (backward compatibility)
  fastify.get('/search-jobs/:id/results', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = getUserId(request);
    const job = getSearchJob(id);
    if (!job) throw new NotFoundError('Search job');
    if (job.status !== 'completed') {
      return reply.send(successResponse({ results: [] }));
    }
    const results = job.results.filter((r) => r.userId === userId);
    return reply.send(successResponse({ results }));
  });

  // GET /api/search (list user search jobs)
  fastify.get('/api/search', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const jobs = getUserSearchJobs(userId);
    return reply.send(successResponse({ jobs }));
  });

  // ── Activities ──────────────────────────────────────────────────────────────
  const handleGetActivities = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const activities = getUserActivities(userId, 50);
    return reply.send(successResponse({ activities }));
  };
  fastify.get('/activities', { preHandler: authenticate }, handleGetActivities);
  fastify.get('/api/activities', { preHandler: authenticate }, handleGetActivities);

  // ── Leads CRUD ──────────────────────────────────────────────────────────────
  const handleGetLeads = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const query = leadsQuerySchema.parse(request.query);

    let leads = getUserLeads(userId);

    // Filters
    if (query.status) leads = leads.filter((l) => l.status === query.status);
    if (query.category) {
      leads = leads.filter((l) => l.category.toLowerCase().includes(query.category!.toLowerCase()));
    }
    if (query.city) {
      leads = leads.filter((l) => (l.city || '').toLowerCase().includes(query.city!.toLowerCase()));
    }
    if (query.minScore !== undefined) {
      leads = leads.filter((l) => l.leadScore >= query.minScore!);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(s) ||
          l.city?.toLowerCase().includes(s) ||
          l.category.toLowerCase().includes(s) ||
          l.phone?.includes(s) ||
          l.email?.toLowerCase().includes(s)
      );
    }

    // Sort
    leads.sort((a, b) => {
      const field = query.sortBy as keyof typeof a;
      const av = a[field] as string | number;
      const bv = b[field] as string | number;
      const dir = query.sortOrder === 'asc' ? 1 : -1;
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });

    // Paginate
    const total = leads.length;
    const start = (query.page - 1) * query.limit;
    const paginated = leads.slice(start, start + query.limit);

    return reply.send(
      successResponse({
        leads: paginated,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      })
    );
  };
  fastify.get('/leads', { preHandler: authenticate }, handleGetLeads);
  fastify.get('/api/leads', { preHandler: authenticate }, handleGetLeads);

  // GET /leads/hot
  fastify.get('/leads/hot', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const threshold = parseInt((request.query as { threshold?: string }).threshold || '70', 10);
    const leads = getUserLeads(userId)
      .filter((l) => l.leadScore >= threshold)
      .sort((a, b) => b.leadScore - a.leadScore);

    return reply.send(successResponse({ leads, threshold }));
  });

  // POST /api/leads & POST /leads (manual lead creation)
  const handleCreateLead = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const body = createLeadSchema.parse(request.body);
    const lead = createLead(userId, body, body.serviceType);
    return reply.status(201).send(successResponse({ lead }));
  };
  fastify.post('/leads', { preHandler: authenticate }, handleCreateLead);
  fastify.post('/api/leads', { preHandler: authenticate }, handleCreateLead);

  // GET /api/leads/:id & GET /leads/:id
  const handleGetLeadById = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const lead = getLeadById(userId, id);
    if (!lead) throw new NotFoundError('Lead');
    return reply.send(successResponse({ lead }));
  };
  fastify.get('/leads/:id', { preHandler: authenticate }, handleGetLeadById);
  fastify.get('/api/leads/:id', { preHandler: authenticate }, handleGetLeadById);

  // PATCH /api/leads/:id & PATCH /leads/:id
  const handleUpdateLead = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const body = updateLeadSchema.parse(request.body);
    const updated = updateLead(userId, id, body);
    if (!updated) throw new NotFoundError('Lead');
    return reply.send(successResponse({ lead: updated }));
  };
  fastify.patch('/leads/:id', { preHandler: authenticate }, handleUpdateLead);
  fastify.patch('/api/leads/:id', { preHandler: authenticate }, handleUpdateLead);

  // DELETE /api/leads/:id & DELETE /leads/:id
  const handleDeleteLead = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const query = request.query as { permanent?: string };
    const permanent = query?.permanent === 'true';
    const deleted = deleteLead(userId, id, permanent);
    if (!deleted) throw new NotFoundError('Lead');
    return reply.send(
      successResponse({ message: permanent ? 'Lead permanently removed' : 'Lead archived' })
    );
  };
  fastify.delete('/leads/:id', { preHandler: authenticate }, handleDeleteLead);
  fastify.delete('/api/leads/:id', { preHandler: authenticate }, handleDeleteLead);

  // POST /leads/bulk-update
  fastify.post('/leads/bulk-update', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(100),
        status: LeadStatus,
      })
      .parse(request.body);

    const updated = [];
    for (const id of body.ids) {
      const lead = updateLead(userId, id, { status: body.status });
      if (lead) updated.push(lead);
    }

    return reply.send(successResponse({ updated: updated.length }));
  });

  // POST /leads/bulk-delete
  fastify.post('/leads/bulk-delete', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(100),
      })
      .parse(request.body);

    let deleted = 0;
    for (const id of body.ids) {
      if (deleteLead(userId, id, false)) deleted++;
    }

    return reply.send(successResponse({ deleted }));
  });
}
