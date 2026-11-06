/**
 * Cart API - 购物车管理（单店版）
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { AppType } from '../types';
import { response } from '../utils/response';

// Validation Schemas
const addToCartSchema = z.object({
  session_id: z.string().optional(),
  dish_id: z.string().min(1),
  table_number: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  soup_base: z.string().default(''),
  style: z.string().default(''),
  addons: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().default(0),
  })).default([]),
  note: z.string().optional(),
});

const batchAddToCartSchema = z.object({
  session_id: z.string().optional(),
  table_number: z.string().min(1),
  items: z.array(z.object({
    dish_id: z.string().min(1),
    quantity: z.number().int().positive(),
    soup_base: z.string().default(''),
    style: z.string().default(''),
    addons: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().default(0),
    })).default([]),
  })),
});

export const cartRoutes = new Hono<AppType>();

// ==================== Get Cart ====================

cartRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId');
  const tableNumber = c.req.query('tableNo');
  const lang = c.get('lang') || 'zh-CN';

  if (!userId && !sessionId) {
    return c.json(response(null, 40101, 'Not authenticated'), 401);
  }

  let whereClause = `WHERE c.status = 'active' AND c.expires_at > datetime('now')`;
  const bindings: any[] = [];

  if (userId) {
    whereClause += ` AND c.user_id = ?`;
    bindings.push(userId);
  } else {
    whereClause += ` AND c.session_id = ?`;
    bindings.push(sessionId || '');
  }

  if (tableNumber) {
    whereClause += ` AND c.table_number = ?`;
    bindings.push(tableNumber);
  }

  // Get cart items
  const result = await db.prepare(`
    SELECT
      c.*,
      d.name as dish_name,
      d.name_en as dish_name_en,
      d.image_url as dish_image,
      d.price as dish_price,
      d.is_available as dish_available,
      d.is_sold_out as dish_sold_out
    FROM cart c
    JOIN dish d ON c.dish_id = d.id
    ${whereClause}
    ORDER BY c.created_at DESC
  `).bind(...bindings).all();

  let itemCount = 0;
  let subtotal = 0;

  const items = (result.results || []).map((item: any) => {
    const itemSubtotal = (item.dish_price) * item.quantity;
    itemCount += item.quantity;
    subtotal += itemSubtotal;

    return {
      id: item.id,
      dish_id: item.dish_id,
      dish_name: lang !== 'zh-CN' && item.dish_name_en ? item.dish_name_en : item.dish_name,
      dish_image: item.dish_image,
      dish_price: item.dish_price,
      dish_available: item.dish_available,
      dish_sold_out: item.dish_sold_out,
      quantity: item.quantity,
      soup_base: item.soup_base,
      style: item.style,
      addons: typeof item.addons === 'string' ? JSON.parse(item.addons || '[]') : item.addons,
      note: item.note,
      unit_price: item.dish_price,
      subtotal: itemSubtotal,
    };
  });

  return c.json(response({
    items,
    item_count: itemCount,
    subtotal,
    total: subtotal,
  }));
});

// ==================== Add to Cart ====================

cartRoutes.post('/items', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId') || crypto.randomUUID();
  const lang = c.get('lang') || 'zh-CN';

  const body = await c.req.json();

  const validation = addToCartSchema.safeParse(body);
  if (!validation.success) {
    return c.json(response(null, 40001, 'Validation error', {
      errors: validation.error.errors,
    }), 400);
  }

  const data = validation.data;

  // Check dish availability
  const dish = await db.prepare(`
    SELECT d.*, d.max_per_order
    FROM dish d
    WHERE d.id = ? AND d.deleted_at IS NULL
  `).bind(data.dish_id).first() as any;

  if (!dish) {
    return c.json(response(null, 40401, 'Dish not found'), 404);
  }

  if (!dish.is_available || dish.is_sold_out) {
    return c.json(response(null, 40402, 'Dish sold out or unavailable'), 400);
  }

  // Check if item already in cart
  const existing = await db.prepare(`
    SELECT * FROM cart
    WHERE status = 'active'
      AND ((user_id = ? AND ? IS NOT NULL) OR (session_id = ? AND ? IS NOT NULL))
      AND dish_id = ?
      AND soup_base = ?
      AND style = ?
      AND addons = ?
  `).bind(
    userId || null,
    userId,
    sessionId,
    sessionId,
    data.dish_id,
    data.soup_base,
    data.style,
    JSON.stringify(data.addons)
  ).first();

  let result;
  if (existing) {
    const newQuantity = existing.quantity + data.quantity;

    if (newQuantity > dish.max_per_order) {
      return c.json(response(null, 40005, `Maximum ${dish.max_per_order} per order`), 400);
    }

    await db.prepare(`
      UPDATE cart
      SET quantity = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newQuantity, existing.id).run();

    result = { id: existing.id, quantity: newQuantity };
  } else {
    const price = dish.price + data.addons.reduce((sum: number, c: any) => sum + c.price, 0);

    result = await db.prepare(`
      INSERT INTO cart (
        user_id, session_id, table_number, dish_id, quantity,
        soup_base, style, addons, note, dish_snapshot, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
    `).bind(
      userId || null,
      sessionId,
      data.table_number,
      data.dish_id,
      data.quantity,
      data.soup_base,
      data.style,
      JSON.stringify(data.addons),
      data.note || null,
      JSON.stringify({
        name: lang !== 'zh-CN' && dish.name_en ? dish.name_en : dish.name,
        price: dish.price,
        image_url: dish.image_url,
      })
    ).run();

    result = { id: result.meta.last_row_id, quantity: data.quantity };
  }

  return c.json(response(result), 201);
});

// ==================== Batch Add to Cart ====================

cartRoutes.post('/batch', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId') || crypto.randomUUID();
  const lang = c.get('lang') || 'zh-CN';

  const body = await c.req.json();

  const validation = batchAddToCartSchema.safeParse(body);
  if (!validation.success) {
    return c.json(response(null, 40001, 'Validation error', {
      errors: validation.error.errors,
    }), 400);
  }

  const { session_id, table_number, items } = validation.data;

  const results: any[] = [];
  const errors: any[] = [];

  for (const item of items) {
    try {
      const dish = await db.prepare(`
        SELECT * FROM dish WHERE id = ? AND deleted_at IS NULL
      `).bind(item.dish_id).first();

      if (!dish || !dish.is_available || dish.is_sold_out) {
        errors.push({ dish_id: item.dish_id, error: 'Unavailable' });
        continue;
      }

      const price = dish.price + item.addons.reduce((sum: number, c: any) => sum + c.price, 0);

      const result = await db.prepare(`
        INSERT INTO cart (
          user_id, session_id, table_number, dish_id, quantity,
          soup_base, style, addons, dish_snapshot, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
      `).bind(
        userId || null,
        session_id,
        table_number,
        item.dish_id,
        item.quantity,
        item.soup_base,
        item.style,
        JSON.stringify(item.addons),
        JSON.stringify({
          name: lang !== 'zh-CN' && dish.name_en ? dish.name_en : dish.name,
          price: dish.price,
          image_url: dish.image_url,
        })
      ).run();

      results.push({ dish_id: item.dish_id, id: result.meta.last_row_id });
    } catch (error) {
      errors.push({ dish_id: item.dish_id, error: 'Failed to add' });
    }
  }

  return c.json(response({
    added: results,
    errors: errors.length > 0 ? errors : undefined,
    total_added: results.length,
  }), errors.length === 0 ? 201 : 207);
});

// ==================== Update Cart Item ====================

cartRoutes.patch('/items/:id', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { quantity } = body;

  if (!quantity || quantity < 1) {
    return c.json(response(null, 40001, 'Invalid quantity'), 400);
  }

  const cart = await db.prepare(`
    SELECT * FROM cart
    WHERE id = ? AND status = 'active'
      AND ((user_id = ? AND ? IS NOT NULL) OR (session_id = ? AND ? IS NOT NULL))
  `).bind(id, userId || null, userId, sessionId || null, sessionId).first();

  if (!cart) {
    return c.json(response(null, 40401, 'Cart item not found'), 404);
  }

  const dish = await db.prepare(`
    SELECT max_per_order FROM dish WHERE id = ?
  `).bind(cart.dish_id).first();

  if (quantity > (dish?.max_per_order || 99)) {
    return c.json(response(null, 40005, `Maximum ${dish?.max_per_order || 99} per order`), 400);
  }

  await db.prepare(`
    UPDATE cart SET quantity = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(quantity, id).run();

  return c.json(response({ success: true }));
});

// ==================== Delete Cart Item ====================

cartRoutes.delete('/items/:id', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId');
  const id = c.req.param('id');

  await db.prepare(`
    UPDATE cart SET status = 'deleted', updated_at = datetime('now')
    WHERE id = ? AND status = 'active'
      AND ((user_id = ? AND ? IS NOT NULL) OR (session_id = ? AND ? IS NOT NULL))
  `).bind(id, userId || null, userId, sessionId || null, sessionId).run();

  return c.json(response({ success: true }));
});

// ==================== Clear Cart ====================

cartRoutes.delete('/', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId');
  const tableNumber = c.req.query('tableNo');

  let whereClause = `WHERE status = 'active'`;
  const bindings: any[] = [];

  if (userId) {
    whereClause += ` AND user_id = ?`;
    bindings.push(userId);
  } else {
    whereClause += ` AND session_id = ?`;
    bindings.push(sessionId || '');
  }

  if (tableNumber) {
    whereClause += ` AND table_number = ?`;
    bindings.push(tableNumber);
  }

  await db.prepare(`
    UPDATE cart SET status = 'deleted', updated_at = datetime('now')
    ${whereClause}
  `).bind(...bindings).run();

  return c.json(response({ success: true }));
});
