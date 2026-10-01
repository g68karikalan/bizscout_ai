import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { signupUser, loginUser, mockLogout, getProfile, upsertProfile } from '../services/authService.js';
import { authenticate, getUserId } from '../middleware/auth.js';
import { successResponse } from '../errors/errorHandler.js';
import { ValidationError } from '../errors/AppError.js';

const signupSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  fullName: z.string().min(2, 'Full name is required'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  fullName: z.string().min(2).optional(),
  businessName: z.string().optional(),
  role: z.string().optional(),
  services: z.array(z.string()).optional(),
  targetIndustries: z.array(z.string()).optional(),
  defaultCountry: z.string().optional(),
  defaultState: z.string().optional(),
  defaultCity: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/signup & POST /api/auth/signup
  const handleSignup = async (request: any, reply: any) => {
    const body = signupSchema.parse(request.body);

    try {
      const { token, userId } = await signupUser(body.email, body.password, body.fullName);

      // Create initial profile
      const profile = upsertProfile(userId, { fullName: body.fullName });

      return reply.status(201).send(
        successResponse({ token, userId, profile })
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'EMAIL_EXISTS') {
        throw new ValidationError('An account with this email already exists');
      }
      throw error;
    }
  };
  fastify.post('/auth/signup', handleSignup);
  fastify.post('/api/auth/signup', handleSignup);

  // POST /auth/login & POST /api/auth/login
  const handleLogin = async (request: any, reply: any) => {
    const body = loginSchema.parse(request.body);

    try {
      const { token, userId, name } = await loginUser(body.email, body.password);
      const profile = getProfile(userId);
      return reply.send(successResponse({ token, userId, name, profile }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'INVALID_CREDENTIALS') {
        throw new ValidationError('Invalid email or password');
      }
      throw error;
    }
  };
  fastify.post('/auth/login', handleLogin);
  fastify.post('/api/auth/login', handleLogin);

  // POST /auth/logout & POST /api/auth/logout
  const handleLogout = async (request: any, reply: any) => {
    const token = request.headers.authorization!.slice(7);
    mockLogout(token);
    return reply.send(successResponse({ message: 'Logged out' }));
  };
  fastify.post('/auth/logout', { preHandler: authenticate }, handleLogout);
  fastify.post('/api/auth/logout', { preHandler: authenticate }, handleLogout);

  // GET /auth/me & GET /api/auth/me
  const handleMe = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const profile = getProfile(userId);
    return reply.send(successResponse({ userId, profile }));
  };
  fastify.get('/auth/me', { preHandler: authenticate }, handleMe);
  fastify.get('/api/auth/me', { preHandler: authenticate }, handleMe);

  // POST /auth/profile & POST /api/auth/profile
  const handleCreateProfile = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const body = profileSchema.parse(request.body);
    const profile = upsertProfile(userId, body as any);
    return reply.send(successResponse({ profile }));
  };
  fastify.post('/auth/profile', { preHandler: authenticate }, handleCreateProfile);
  fastify.post('/api/auth/profile', { preHandler: authenticate }, handleCreateProfile);

  // PATCH /auth/profile & PATCH /api/auth/profile
  const handleUpdateProfile = async (request: any, reply: any) => {
    const userId = getUserId(request);
    const body = profileSchema.parse(request.body);
    const profile = upsertProfile(userId, body as any);
    return reply.send(successResponse({ profile }));
  };
  fastify.patch('/auth/profile', { preHandler: authenticate }, handleUpdateProfile);
  fastify.patch('/api/auth/profile', { preHandler: authenticate }, handleUpdateProfile);
}
