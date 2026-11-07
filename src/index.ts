/**
 * 面馆扫码点餐系统 API - Cloudflare Workers 入口（单店版）
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// API Routes (单店版)
import { dishRoutes } from './api/dishes';
import { cartRoutes } from './api/cart';
import { orderRoutes } from './api/orders';
import { userRoutes } from './api/users';
import { paymentRoutes } from './api/payment';

// Config
import { config } from './config';
import { AuthService } from './services/auth';

// Types
import { AppType, Env } from './types';
import { response } from './utils/response';

const app = new Hono<AppType>();

// ==================== Initialize Services ====================

const getAuthService = (env: Env): AuthService => {
  return new AuthService(env.DB, env.CACHE, {
    jwtSecret: env.JWT_SECRET || 'default-secret-change-in-production',
    jwtExpiresIn: '7d',
    refreshExpiresIn: '30d',
  });
};

// ==================== CORS Configuration ====================

const getCorsOrigin = (origin: string): string => {
  const allowedOrigins = [
    'https://dd.tray.cc.cd',
    'https://noodle-shop.pages.dev',
    'https://noodle-admin.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  if (origin && /^https:\/\/[\w-]+\.pages\.dev$/.test(origin)) {
    return origin;
  }
  if (config.env !== 'production') {
    return origin || '*';
  }
  return allowedOrigins[0];
};

// ==================== Middleware ====================

// CORS
app.use('/*', cors({
  origin: getCorsOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Session-ID'],
  credentials: true,
}));

// Logger
app.use('/*', logger());

// Language Detection
app.use('/*', async (c, next) => {
  const lang = c.req.header('Accept-Language')?.split(',')[0] || config.languages.default;
  c.set('lang', lang);
  const sessionId = c.req.header('X-Session-ID');
  if (sessionId) {
    c.set('sessionId', sessionId);
  }
  await next();
});

// ==================== Authentication ====================

// 公开接口（无需认证）
const publicPaths = [
  '/health',
  '/api/v1/health',
  '/api/v1/shop',
  '/api/v1/menu',
  '/api/v1/menu/categories',
  '/api/v1/dishes',
  '/api/v1/i18n',
  '/api/v1/search',
];

app.use('/api/v1/*', async (c, next) => {
  const path = c.req.path;

  if (publicPaths.some(p => path.startsWith(p))) {
    return await next();
  }

  const auth = getAuthService(c.env);
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    const result = await auth.verifyToken(token);
    if (result.valid && result.payload) {
      c.set('userId', result.payload.userId);
      c.set('userRole', result.payload.role);
    }
  }

  await next();
});

// ==================== Health Check ====================

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

app.get('/api/v1/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ==================== Shop Config (GET /api/v1/shop) ====================

app.get('/api/v1/shop', async (c) => {
  const db = c.env.DB;

  const shop = await db.prepare(`
    SELECT
      id, name, address, phone, opening_hours, currency,
      tax_rate, service_fee_rate, min_order_amount, qr_code_base_url
    FROM shop_config
    WHERE id = 'main'
  `).first();

  if (!shop) {
    return c.json({ code: 40401, message: 'Shop not configured', data: null }, 404);
  }

  return c.json({ code: 0, message: 'ok', data: shop });
});

// ==================== Menu (GET /api/v1/menu) ====================

app.get('/api/v1/menu', async (c) => {
  const db = c.env.DB;
  const lang = c.get('lang') || 'zh-CN';
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  const query = `
    SELECT d.*, c.name as category_name
    FROM dish d
    LEFT JOIN dish_category c ON d.category_id = c.id
    WHERE d.deleted_at IS NULL
      AND d.status = 'active'
      AND d.is_available = 1
      AND d.is_sold_out = 0
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db.prepare(query).bind(limit, offset).all();

  const translatedResults = (result.results || []).map((dish: any) => {
    if (lang !== 'zh-CN' && dish.name_en) {
      return { ...dish, display_name: dish.name_en };
    }
    return { ...dish, display_name: dish.name };
  });

  return c.json(response(translatedResults));
});

// ==================== Menu Categories (GET /api/v1/menu/categories) ====================

app.get('/api/v1/menu/categories', async (c) => {
  const db = c.env.DB;

  const result = await db.prepare(`
    SELECT id, name, name_en, description, sort_order
    FROM dish_category
    WHERE deleted_at IS NULL
      AND is_active = 1
    ORDER BY sort_order ASC
  `).all();

  return c.json(response(result.results || []));
});

// ==================== API Routes (单店版) ====================

app.route('/api/v1/dishes', dishRoutes);
app.route('/api/v1/cart', cartRoutes);
app.route('/api/v1/orders', orderRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/payment', paymentRoutes);

// ==================== Error Handler ====================

app.onError((err, c) => {
  console.error('Error:', err.message);
  return c.json({
    code: 50001,
    message: err.message || 'Internal Server Error',
  }, 500);
});

// ==================== 404 Handler ====================

app.notFound((c) => {
  return c.json({
    code: 40401,
    message: 'Resource not found',
  }, 404);
});

// ==================== Export ====================

export default {
  fetch: app.fetch,
};