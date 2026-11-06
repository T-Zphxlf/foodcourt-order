/**
 * Orders API - 订单管理（单店版）
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { AppType } from '../types';
import { response } from '../utils/response';
import { generateUUID } from '../utils/db';

// Validation Schemas
const createOrderSchema = z.object({
  order_type: z.enum(['dine_in', 'takeout']).default('dine_in'),
  table_number: z.string().min(1),
  diners_count: z.number().int().positive().default(1),
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
  })).optional(),
  user_remark: z.string().optional(),
  payment_method: z.string().optional(),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(1),
});

export const orderRoutes = new Hono<AppType>();

// ==================== List Orders ====================

orderRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  const status = c.req.query('status');
  const tableNumber = c.req.query('tableNo');
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  let query = `
    SELECT * FROM user_order
    WHERE 1=1
  `;
  const bindings: any[] = [];

  if (userRole !== 'admin' && userId) {
    query += ` AND (user_id = ? OR guest_session_id IS NOT NULL)`;
    bindings.push(userId);
  }

  if (status) {
    query += ` AND status = ?`;
    bindings.push(status);
  }

  if (tableNumber) {
    query += ` AND table_number = ?`;
    bindings.push(tableNumber);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  bindings.push(limit, offset);

  const result = await db.prepare(query).bind(...bindings).all();

  return c.json(response(result.results || []));
});

// ==================== Get Order ====================

orderRoutes.get('/:id', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  const id = c.req.param('id');

  const order = await db.prepare(`
    SELECT * FROM user_order WHERE id = ?
      AND (user_id = ? OR ? = 'admin' OR guest_session_id IS NOT NULL)
  `).bind(id, userId, userRole).first();

  if (!order) {
    return c.json(response(null, 40401, 'Order not found'), 404);
  }

  const items = await db.prepare(`
    SELECT * FROM order_item WHERE order_id = ?
  `).bind(id).all();

  return c.json(response({
    ...order,
    items: items.results,
  }));
});

// ==================== Create Order ====================

orderRoutes.post('/', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const sessionId = c.get('sessionId');
  const lang = c.get('lang') || 'zh-CN';

  const body = await c.req.json();

  const validation = createOrderSchema.safeParse(body);
  if (!validation.success) {
    return c.json(response(null, 40001, 'Validation error', {
      errors: validation.error.errors,
    }), 400);
  }

  const data = validation.data;
  const orderId = generateUUID();
  const orderNo = `NOODLE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now() % 100000).padStart(5, '0')}`;

  let itemCount = 0;
  let subtotal = 0;
  const orderItems: any[] = [];

  const itemsToProcess = data.items || [];

  for (const item of itemsToProcess) {
    const dish = await db.prepare(`
      SELECT * FROM dish WHERE id = ? AND deleted_at IS NULL
    `).bind(item.dish_id).first();

    if (!dish) {
      return c.json(response(null, 40401, `Dish not found: ${item.dish_id}`), 404);
    }

    if (!dish.is_available || dish.is_sold_out) {
      return c.json(response(null, 40402, `Dish sold out: ${dish.name}`), 400);
    }

    const addonPrice = item.addons.reduce((sum: number, c: any) => sum + c.price, 0);
    const unitPrice = dish.price + addonPrice;
    const itemSubtotal = unitPrice * item.quantity;

    itemCount += item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      dish_id: item.dish_id,
      dish_snapshot: JSON.stringify({
        name: lang !== 'zh-CN' && dish.name_en ? dish.name_en : dish.name,
        image_url: dish.image_url,
        price: dish.price,
      }),
      soup_base: item.soup_base,
      style: item.style,
      addons: JSON.stringify(item.addons),
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal_amount: itemSubtotal,
      customization_details: JSON.stringify(item.addons),
      status: 'pending',
    });

    await db.prepare(`
      UPDATE dish SET total_sold = COALESCE(total_sold, 0) + ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(item.quantity, item.dish_id).run();
  }

  const shopConfig = await db.prepare('SELECT tax_rate, service_fee_rate FROM shop_config WHERE id = ?').bind('main').first() as any;
  const taxRate = shopConfig?.tax_rate ?? 0;
  const serviceFeeRate = shopConfig?.service_fee_rate ?? 0;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const serviceFeeAmount = Math.round(subtotal * serviceFeeRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + serviceFeeAmount) * 100) / 100;

  await db.prepare(`
    INSERT INTO user_order (
      id, order_no, user_id, guest_session_id,
      table_number, order_type, diners_count,
      item_count, subtotal_amount, tax_amount, service_fee_amount, total_amount,
      payment_status, status, user_remark, payment_method,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, datetime('now'))
  `).bind(
    orderId,
    orderNo,
    userId || null,
    sessionId || null,
    data.table_number,
    data.order_type,
    data.diners_count,
    itemCount,
    subtotal,
    taxAmount,
    serviceFeeAmount,
    totalAmount,
    data.payment_method || null,
    data.user_remark || null
  ).run();

  for (const item of orderItems) {
    await db.prepare(`
      INSERT INTO order_item (
        order_id, dish_id, dish_snapshot, soup_base, style, addons,
        quantity, unit_price, subtotal_amount, customization_details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      orderId,
      item.dish_id,
      item.dish_snapshot,
      item.soup_base,
      item.style,
      item.addons,
      item.quantity,
      item.unit_price,
      item.subtotal_amount,
      item.customization_details
    ).run();
  }

  return c.json(response({
    order_id: orderId,
    order_no: orderNo,
    total_amount: totalAmount,
    item_count: itemCount,
  }), 201);
});

// ==================== Cancel Order ====================

orderRoutes.post('/:id/cancel', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const id = c.req.param('id');

  const body = await c.req.json();
  const { reason } = body;

  const order = await db.prepare(`
    SELECT * FROM user_order
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).bind(id, userId, 'admin').first();

  if (!order) {
    return c.json(response(null, 40401, 'Order not found'), 404);
  }

  if (!['pending', 'paid'].includes(order.status)) {
    return c.json(response(null, 40005, 'Order cannot be cancelled'), 400);
  }

  const items = await db.prepare(`
    SELECT * FROM order_item WHERE order_id = ?
  `).bind(id).all();

  for (const item of (items.results || [])) {
    if (item.dish_id) {
      await db.prepare(`
        UPDATE dish
        SET remaining_stock = COALESCE(remaining_stock, 0) + ?,
            total_sold = COALESCE(total_sold, 0) - ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(item.quantity, item.quantity, item.dish_id).run();
    }
  }

  await db.prepare(`
    UPDATE user_order
    SET status = 'cancelled',
        cancel_reason = ?,
        cancelled_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(reason, id).run();

  await db.prepare(`
    UPDATE order_item SET status = 'cancelled', cancelled_at = datetime('now')
    WHERE order_id = ?
  `).bind(id).run();

  return c.json(response({ success: true }));
});

// ==================== Complete Order ====================

orderRoutes.post('/:id/complete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare(`
    UPDATE user_order
    SET status = 'completed',
        completed_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ? AND status = 'ready'
  `).bind(id).run();

  return c.json(response({ success: true }));
});

// ==================== Create Payment ====================

orderRoutes.post('/:id/payment', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { payment_method } = body;

  const order = await db.prepare(`
    SELECT * FROM user_order
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).bind(id, userId, 'admin').first();

  if (!order) {
    return c.json(response(null, 40401, 'Order not found'), 404);
  }

  if (order.payment_status !== 'pending') {
    return c.json(response(null, 40005, 'Order already paid'), 400);
  }

  await db.prepare(`
    UPDATE user_order
    SET payment_method = ?,
        payment_status = 'processing',
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(payment_method || 'mock', id).run();

  const paymentUrl = `https://payment.example.com/pay/${order.order_no}`;

  return c.json(response({
    order_id: id,
    order_no: order.order_no,
    amount: order.total_amount,
    payment_url: paymentUrl,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }));
});

// ==================== Apply Refund ====================

orderRoutes.post('/:id/refund', async (c) => {
  const db = c.env.DB;
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { reason, refund_amount } = body;

  const order = await db.prepare(`
    SELECT * FROM user_order
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).bind(id, userId, 'admin').first();

  if (!order) {
    return c.json(response(null, 40401, 'Order not found'), 404);
  }

  const refund = refund_amount || order.total_amount;

  await db.prepare(`
    UPDATE user_order
    SET status = 'refunded',
        refund_amount = ?,
        cancel_reason = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(refund, reason, id).run();

  return c.json(response({
    success: true,
    refund_amount: refund,
  }));
});
