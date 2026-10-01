import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUserId } from '../middleware/auth.js';
import { getUserLeads } from '../services/leadService.js';
import { successResponse } from '../errors/errorHandler.js';

export async function exportRoutes(fastify: FastifyInstance) {
  const exportSchema = z.object({
    format: z.enum(['csv', 'json']).default('csv'),
    columns: z.array(z.string()).optional(),
    filters: z
      .object({
        status: z.string().optional(),
        minScore: z.number().optional(),
        category: z.string().optional(),
      })
      .optional(),
  });

  const DEFAULT_COLUMNS = [
    'name', 'category', 'address', 'city', 'state', 'country',
    'phone', 'email', 'website', 'instagramUrl', 'facebookUrl',
    'rating', 'reviewCount', 'leadScore', 'status', 'notes',
    'source', 'createdAt',
  ];

  // POST /exports/csv
  fastify.post('/exports/csv', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const body = exportSchema.parse(request.body);

    let leads = getUserLeads(userId);

    if (body.filters) {
      const f = body.filters;
      if (f.status) leads = leads.filter((l) => l.status === f.status);
      if (f.minScore !== undefined) leads = leads.filter((l) => l.leadScore >= f.minScore!);
      if (f.category) leads = leads.filter((l) => l.category.toLowerCase().includes(f.category!.toLowerCase()));
    }

    const columns = body.columns || DEFAULT_COLUMNS;
    
    // Build CSV
    const header = columns.join(',');
    const rows = leads.map((lead) =>
      columns
        .map((col) => {
          const val = (lead as unknown as Record<string, unknown>)[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape CSV
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );

    const csv = [header, ...rows].join('\n');

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="bizscout-leads-${Date.now()}.csv"`)
      .send(csv);
  });

  // POST /exports/json
  fastify.post('/exports/json', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const body = exportSchema.parse(request.body);

    let leads = getUserLeads(userId);

    if (body.filters) {
      const f = body.filters;
      if (f.status) leads = leads.filter((l) => l.status === f.status);
      if (f.minScore !== undefined) leads = leads.filter((l) => l.leadScore >= f.minScore!);
    }

    return reply.send(successResponse({ leads, exportedAt: new Date().toISOString() }));
  });

  // GET /analytics
  fastify.get('/analytics', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserId(request);
    const query = z
      .object({ period: z.enum(['7d', '30d', '90d']).default('30d') })
      .parse(request.query);

    const leads = getUserLeads(userId);
    const days = query.period === '7d' ? 7 : query.period === '30d' ? 30 : 90;

    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const periodLeads = leads.filter((l) => new Date(l.createdAt) >= periodStart);

    // Lead acquisition over time
    const acquisitionMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      acquisitionMap[key] = 0;
    }
    for (const lead of periodLeads) {
      const key = lead.createdAt.split('T')[0];
      if (key in acquisitionMap) acquisitionMap[key]++;
    }
    const acquisitionTrend = Object.entries(acquisitionMap).map(([date, count]) => ({ date, count }));

    // Score distribution
    const scoreBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const lead of leads) {
      const s = lead.leadScore;
      if (s <= 20) scoreBuckets['0-20']++;
      else if (s <= 40) scoreBuckets['21-40']++;
      else if (s <= 60) scoreBuckets['41-60']++;
      else if (s <= 80) scoreBuckets['61-80']++;
      else scoreBuckets['81-100']++;
    }

    // Category distribution
    const byCategory: Record<string, number> = {};
    for (const lead of leads) {
      byCategory[lead.category] = (byCategory[lead.category] || 0) + 1;
    }

    // City distribution
    const byCity: Record<string, number> = {};
    for (const lead of leads) {
      const city = lead.city || 'Unknown';
      byCity[city] = (byCity[city] || 0) + 1;
    }

    // Funnel
    const funnel = {
      found: leads.length,
      contacted: leads.filter((l) => ['contacted', 'follow_up', 'replied', 'qualified', 'won'].includes(l.status)).length,
      replied: leads.filter((l) => ['replied', 'qualified', 'won'].includes(l.status)).length,
      converted: leads.filter((l) => l.status === 'won').length,
    };

    return reply.send(
      successResponse({
        period: query.period,
        totals: {
          total: leads.length,
          newThisPeriod: periodLeads.length,
          contacted: funnel.contacted,
          replied: funnel.replied,
          won: funnel.converted,
          hot: leads.filter((l) => l.leadScore >= 70).length,
        },
        acquisitionTrend,
        scoreBuckets,
        byCategory,
        byCity,
        funnel,
      })
    );
  });
}
