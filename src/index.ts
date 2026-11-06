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

// ==================== 管理员认证中间件 ====================

async function requireAdmin(c: any, next: any) {
  const auth = getAuthService(c.env);
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ code: 40101, message: '未登录，请先登录', data: null }, 401);
  }

  const result = await auth.verifyToken(token);
  if (!result.valid || !result.payload) {
    return c.json({ code: 40101, message: 'Token 无效或已过期', data: null }, 401);
  }

  if (result.payload.role !== 'admin' && result.payload.role !== 'super_admin') {
    return c.json({ code: 40301, message: '需要管理员权限', data: null }, 403);
  }

  c.set('userId', result.payload.userId);
  c.set('userRole', result.payload.role);
  await next();
}

// ==================== 管理端点：登录 (POST /api/v1/admin/auth/login) ====================

app.post('/api/v1/admin/auth/login', async (c) => {
  const db = c.env.DB;
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ code: 40001, message: '邮箱和密码不能为空', data: null }, 400);
  }

  // 从 shop_config 获取管理员密码哈希
  const shop = await db.prepare(`
    SELECT id, name, admin_pwd_hash FROM shop_config WHERE id = 'main'
  `).first() as any;

  if (!shop || !shop.admin_pwd_hash || shop.admin_pwd_hash !== password) {
    return c.json({ code: 40101, message: '邮箱或密码错误', data: null }, 401);
  }

  // 创建一个管理员用户对象生成 token
  const user = {
    id: 'admin-main',
    email,
    role: 'super_admin',
    status: 'active',
  };

  const authService = getAuthService(c.env);
  const tokens = await authService.generateTokens(user as any);

  return c.json({
    code: 0,
    message: '登录成功',
    data: {
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: { id: user.id, email, role: user.role },
    },
  });
});

// ==================== 管理端点：店铺配置 (GET/PUT /api/v1/admin/shop) ====================

app.get('/api/v1/admin/shop', requireAdmin, async (c) => {
  const db = c.env.DB;

  const shop = await db.prepare(`
    SELECT id, name, address, phone, opening_hours, currency,
           tax_rate, service_fee_rate, min_order_amount, qr_code_base_url
    FROM shop_config WHERE id = 'main'
  `).first();

  if (!shop) {
    return c.json({ code: 40401, message: '店铺未配置', data: null }, 404);
  }

  return c.json({ code: 0, message: 'ok', data: shop });
});

app.put('/api/v1/admin/shop', requireAdmin, async (c) => {
  const db = c.env.DB;
  const data = await c.req.json<{
    name?: string; address?: string; phone?: string; opening_hours?: string;
    currency?: string; tax_rate?: number; service_fee_rate?: number;
    min_order_amount?: number; qr_code_base_url?: string;
  }>();

  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.opening_hours !== undefined) { fields.push('opening_hours = ?'); values.push(data.opening_hours); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
  if (data.tax_rate !== undefined) { fields.push('tax_rate = ?'); values.push(data.tax_rate); }
  if (data.service_fee_rate !== undefined) { fields.push('service_fee_rate = ?'); values.push(data.service_fee_rate); }
  if (data.min_order_amount !== undefined) { fields.push('min_order_amount = ?'); values.push(data.min_order_amount); }
  if (data.qr_code_base_url !== undefined) { fields.push('qr_code_base_url = ?'); values.push(data.qr_code_base_url); }

  if (fields.length === 0) {
    return c.json({ code: 40001, message: '没有要更新的字段', data: null }, 400);
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push('main');

  await db.prepare(`UPDATE shop_config SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json({ code: 0, message: '店铺配置已更新', data: null });
});

// ==================== 管理端点：菜品管理 (GET/POST /api/v1/admin/dishes) ====================

app.get('/api/v1/admin/dishes', requireAdmin, async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');
  const categoryId = c.req.query('category_id');

  let query = `
    SELECT d.*, c.name as category_name
    FROM dish d
    LEFT JOIN dish_category c ON d.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) { query += ' AND d.status = ?'; params.push(status); }
  if (categoryId) { query += ' AND d.category_id = ?'; params.push(categoryId); }

  query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();

  // 统计总数
  let countQuery = 'SELECT COUNT(*) as cnt FROM dish d WHERE 1=1';
  const countParams: any[] = [];
  if (status) { countQuery += ' AND d.status = ?'; countParams.push(status); }
  if (categoryId) { countQuery += ' AND d.category_id = ?'; countParams.push(categoryId); }
  const countResult = await db.prepare(countQuery).bind(...countParams).first() as any;
  const total = countResult?.cnt || 0;

  return c.json({
    code: 0,
    message: 'ok',
    data: result.results || [],
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
  });
});

app.get('/api/v1/admin/dishes/:id', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const dish = await db.prepare(`
    SELECT d.*, c.name as category_name
    FROM dish d
    LEFT JOIN dish_category c ON d.category_id = c.id
    WHERE d.id = ?
  `).bind(id).first();

  if (!dish) {
    return c.json({ code: 40401, message: '菜品不存在', data: null }, 404);
  }

  return c.json({ code: 0, message: 'ok', data: dish });
});

app.post('/api/v1/admin/dishes', requireAdmin, async (c) => {
  const db = c.env.DB;
  const data = await c.req.json<any>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO dish (
      id, category_id, name, name_en, description, description_en, price,
      original_price, cost_price, image_url, unit, portion_size,
      soup_bases, styles, addons, has_inventory, remaining_stock,
      low_stock_threshold, max_per_order, is_spicy, spicy_level,
      is_vegetarian, is_vegan, allergens, tags, is_recommended,
      is_available, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.category_id || null, data.name, data.name_en || null,
    data.description || null, data.description_en || null, data.price || 0,
    data.original_price || null, data.cost_price || null, data.image_url || null,
    data.unit || '份', data.portion_size || null,
    data.soup_bases || '[]', data.styles || '[]', data.addons || '[]',
    data.has_inventory !== undefined ? data.has_inventory : 1,
    data.remaining_stock || null, data.low_stock_threshold || 5,
    data.max_per_order || 0, data.is_spicy !== undefined ? data.is_spicy : 0,
    data.spicy_level || null, data.is_vegetarian !== undefined ? data.is_vegetarian : 0,
    data.is_vegan !== undefined ? data.is_vegan : 0,
    data.allergens || null, data.tags || null,
    data.is_recommended !== undefined ? data.is_recommended : 0,
    data.is_available !== undefined ? data.is_available : 1,
    data.status || 'active', now, now
  ).run();

  return c.json({ code: 0, message: '菜品已创建', data: { id } });
});

app.put('/api/v1/admin/dishes/:id', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const data = await c.req.json<any>();
  const now = new Date().toISOString();

  const existing = await db.prepare('SELECT id FROM dish WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ code: 40401, message: '菜品不存在', data: null }, 404);
  }

  const fields: string[] = [];
  const values: any[] = [];

  const updatable = ['category_id','name','name_en','description','description_en','price',
    'original_price','cost_price','image_url','unit','portion_size','soup_bases','styles',
    'addons','has_inventory','remaining_stock','low_stock_threshold','max_per_order',
    'is_spicy','spicy_level','is_vegetarian','is_vegan','allergens','tags','is_recommended',
    'is_available','status'];

  for (const key of updatable) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) {
    return c.json({ code: 40001, message: '没有要更新的字段', data: null }, 400);
  }

  fields.push('updated_at = ?');
  values.push(now, id);

  await db.prepare(`UPDATE dish SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json({ code: 0, message: '菜品已更新', data: null });
});

app.delete('/api/v1/admin/dishes/:id', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const existing = await db.prepare('SELECT id FROM dish WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ code: 40401, message: '菜品不存在', data: null }, 404);
  }

  await db.prepare(`UPDATE dish SET deleted_at = ?, status = 'inactive', updated_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), new Date().toISOString(), id).run();

  return c.json({ code: 0, message: '菜品已删除', data: null });
});

// ==================== 管理端点：订单管理 (GET /api/v1/admin/orders) ====================

app.get('/api/v1/admin/orders', requireAdmin, async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');

  let query = `
    SELECT o.*, u.phone, u.name
    FROM user_order o
    LEFT JOIN "user" u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) { query += ' AND o.status = ?'; params.push(status); }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();

  return c.json({
    code: 0,
    message: 'ok',
    data: result.results || [],
    meta: { page, limit },
  });
});

app.get('/api/v1/admin/orders/:id', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const order = await db.prepare(`
    SELECT o.*, u.phone, u.name
    FROM user_order o
    LEFT JOIN "user" u ON o.user_id = u.id
    WHERE o.id = ?
  `).bind(id).first();

  if (!order) {
    return c.json({ code: 40401, message: '订单不存在', data: null }, 404);
  }

  // 获取订单项
  const items = await db.prepare(`
    SELECT * FROM order_item WHERE order_id = ?
  `).bind(id).all();

  return c.json({ code: 0, message: 'ok', data: { ...order, items: items.results || [] } });
});

// ==================== 管理端点：订单状态变更 ====================

async function updateOrderStatus(c: any, newStatus: string, timestampField?: string) {
  const db = c.env.DB;
  const id = c.req.param('id');

  const order = await db.prepare('SELECT id, status FROM user_order WHERE id = ?').bind(id).first();
  if (!order) {
    return c.json({ code: 40401, message: '订单不存在', data: null }, 404);
  }

  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const values: any[] = [newStatus, new Date().toISOString()];

  if (timestampField) {
    updates.push(`${timestampField} = ?`);
    values.push(new Date().toISOString());
  }

  values.push(id);

  await db.prepare(`UPDATE user_order SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json({ code: 0, message: `订单状态已更新为 ${newStatus}`, data: null });
}

app.post('/api/v1/admin/orders/:id/confirm', requireAdmin, async (c) => {
  return updateOrderStatus(c, 'confirmed', 'confirmed_at');
});

app.post('/api/v1/admin/orders/:id/prepare', requireAdmin, async (c) => {
  return updateOrderStatus(c, 'preparing', 'preparing_at');
});

app.post('/api/v1/admin/orders/:id/ready', requireAdmin, async (c) => {
  return updateOrderStatus(c, 'ready', 'ready_at');
});

app.post('/api/v1/admin/orders/:id/complete', requireAdmin, async (c) => {
  return updateOrderStatus(c, 'completed', 'completed_at');
});

app.post('/api/v1/admin/orders/:id/cancel', requireAdmin, async (c) => {
  return updateOrderStatus(c, 'cancelled', 'cancelled_at');
});

// ==================== 管理端点：统计 (GET /api/v1/admin/stats/overview) ====================

app.get('/api/v1/admin/stats/overview', requireAdmin, async (c) => {
  const db = c.env.DB;

  const totalOrders = await db.prepare('SELECT COUNT(*) as cnt FROM user_order').first() as any;
  const totalRevenue = await db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM user_order WHERE payment_status = 'paid'
  `).first() as any;
  const pendingOrders = await db.prepare("SELECT COUNT(*) as cnt FROM user_order WHERE status = 'pending'").first() as any;
  const paidOrders = await db.prepare("SELECT COUNT(*) as cnt FROM user_order WHERE status = 'paid'").first() as any;

  return c.json({
    code: 0,
    message: 'ok',
    data: {
      total_orders: totalOrders?.cnt || 0,
      total_revenue: totalRevenue?.total || 0,
      pending_orders: pendingOrders?.cnt || 0,
      paid_orders: paidOrders?.cnt || 0,
    },
  });
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
