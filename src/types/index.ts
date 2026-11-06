/**
 * 类型定义（单店版）
 */

import { D1Database } from '@cloudflare/workers-types';
import { KVNamespace } from '@cloudflare/workers-types';

// ==================== Environment ====================

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Cache
  CACHE: KVNamespace;

  // Environment Variables
  ENV: string;
  DEFAULT_LANGUAGE: string;
  SUPPORTED_LANGUAGES: string;
  JWT_SECRET: string;
  OPENAI_API_KEY: string;

  // R2 Storage (optional)
  IMAGES?: any;

  // Payment (optional secrets)
  STRIPE_SECRET_KEY?: string;
  WECHAT_PAY_CONFIG?: string;
  ALIPAY_CONFIG?: string;
  PAYMENT_SUCCESS_URL?: string;
  PAYMENT_CANCEL_URL?: string;
}

// ==================== Hono App Type ====================

export type AppType = {
  Bindings: Env;
  Variables: {
    lang: string;
    sessionId: string;
    userId: string;
    userRole: string;
  };
};

// ==================== Common ====================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface SoftDeleteEntity extends BaseEntity {
  deleted_at: string | null;
}

// ==================== Shop Config ====================

export interface ShopConfig {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  opening_hours: string | null;
  currency: string;
  tax_rate: number;
  service_fee_rate: number;
  min_order_amount: number;
  qr_code_base_url: string | null;
  admin_pwd_hash: string;
  jwt_secret: string;
  wechat_pay_config: string | null;
  alipay_config: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== User ====================

export type UserRole = 'guest' | 'member' | 'admin';
export type UserStatus = 'active' | 'inactive';

export interface User extends SoftDeleteEntity {
  phone: string | null;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  preferred_language: string;
  role: UserRole;
  membership_level: 'bronze' | 'silver' | 'gold';
  membership_points: number;
  total_orders: number;
  total_spent: number;
  status: UserStatus;
  last_login_at: string | null;
}

// ==================== Dish ====================

export interface Dish extends SoftDeleteEntity {
  category_id: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  price: number;
  original_price: number | null;
  cost_price: number | null;
  image_url: string | null;
  unit: string;
  portion_size: string | null;

  // 灵活规格字段
  soup_bases: string;
  styles: string;
  addons: string;

  // 库存管理
  has_inventory: boolean;
  remaining_stock: number | null;
  low_stock_threshold: number;
  max_per_order: number;

  // 属性标签
  is_spicy: boolean;
  spicy_level: number | null;
  is_vegetarian: boolean;
  is_vegan: boolean;
  allergens: string | null;
  tags: string | null;
  is_recommended: boolean;

  // 状态
  is_available: boolean;
  status: 'active' | 'inactive' | 'draft';

  // 统计
  avg_rating: number;
  total_sold: number;

  deleted_at: string | null;
}

// ==================== Cart ====================

export interface CartItem {
  id: string;
  user_id: string | null;
  session_id: string | null;
  table_number: string | null;
  dish_id: string;
  dish_snapshot: {
    name: string;
    price: number;
    image_url: string | null;
  };
  quantity: number;
  soup_base: string;
  style: string;
  addons: string;
  note: string | null;
  status: 'active' | 'ordered' | 'deleted';
  expires_at: string | null;
}

// ==================== Order ====================

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type OrderType = 'dine_in' | 'takeout';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';

export interface Order extends BaseEntity {
  user_id: string | null;
  guest_session_id: string | null;
  order_type: OrderType;
  table_number: string | null;
  diners_count: number;
  item_count: number;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  service_fee_amount: number;
  packaging_fee: number;
  total_amount: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  status: OrderStatus;
  payment_method: string | null;
  transaction_id: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  user_remark: string | null;
  admin_remark: string | null;
  cancel_reason: string | null;
}

export interface OrderItem extends BaseEntity {
  order_id: string;
  dish_id: string | null;
  dish_snapshot: {
    name: string;
    price: number;
    image_url: string | null;
  };
  soup_base: string;
  style: string;
  addons: string;
  quantity: number;
  unit_price: number;
  subtotal_amount: number;
  customization_details: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  served_at: string | null;
  cancelled_at: string | null;
}

// ==================== Dish Customization ====================

export interface SoupBase {
  label: string;
  extraPrice: number;
}

export interface Style {
  label: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

// ==================== Translation ====================

export interface TranslationContent {
  id: string;
  resource_type: string;
  resource_id: string;
  field_name: string;
  lang: string;
  translated_text: string;
  is_auto_translated: boolean;
  quality_score: number | null;
}

// ==================== Review ====================

export interface Review extends BaseEntity {
  order_id: string;
  user_id: string | null;
  dish_id: string | null;
  overall_rating: number;
  food_rating: number | null;
  content: string | null;
  content_images: string[];
  status: 'active' | 'hidden';
  moderation_status: 'pending' | 'approved' | 'rejected';
}

// ==================== Promotion ====================

export interface Promotion extends BaseEntity {
  name: string;
  description: string | null;
  promotion_type: 'discount' | 'coupon' | 'flash_sale' | 'bundle' | 'first_order' | 'loyalty';
  start_time: string;
  end_time: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  status: 'draft' | 'active' | 'paused' | 'expired';
}
