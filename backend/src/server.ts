import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './errors/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { leadsRoutes } from './routes/leads.js';
import { aiRoutes } from './routes/ai.js';
import { campaignRoutes } from './routes/campaigns.js';
import { exportRoutes } from './routes/exports.js';
import { healthRoutes } from './routes/health.js';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  // ── Security ───────────────────────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Let frontend handle CSP
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMIT', message: 'Too many requests, please slow down' },
    }),
  });

  // ── Body size limit ─────────────────────────────────────────────────────────
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string', bodyLimit: 1024 * 1024 }, // 1MB
    (req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // ── Error handler ──────────────────────────────────────────────────────────
  fastify.setErrorHandler(errorHandler);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(leadsRoutes);
  await fastify.register(aiRoutes);
  await fastify.register(campaignRoutes);
  await fastify.register(exportRoutes);

  return fastify;
}

async function main() {
  try {
    const server = await buildServer();
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`\n🚀 BizScout AI Backend running on port ${env.PORT}`);
    console.log(`   Mode: ${env.MOCK_DATA_MODE ? '🎭 MOCK' : '🌐 LIVE'}`);
    console.log(`   Health: http://localhost:${env.PORT}/health\n`);
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
}

main();
