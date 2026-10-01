import { FastifyInstance } from 'fastify';
import { checkSystemHealth } from '../services/healthService.js';

export async function healthRoutes(fastify: FastifyInstance) {
  // GET /health and GET /api/health
  const handler = async () => {
    return await checkSystemHealth();
  };

  fastify.get('/health', handler);
  fastify.get('/api/health', handler);
}
