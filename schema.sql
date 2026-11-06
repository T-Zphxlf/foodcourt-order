-- 面馆扫码点餐系统 - 数据库 Schema（单店裁剪版，Cloudflare D1）
-- 一次性导入：全部复制粘贴到 D1 Studio SQL 编辑器，点 Run 即可

CREATE TABLE IF NOT EXISTS shop_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  name TEXT NOT NULL DEFAULT '我的面馆',
  address TEXT,
  phone TEXT,
  opening_hours TEXT,
  currency TEXT DEFAULT 'CNY',
  tax_rate REAL DEFAULT 0,
  service_fee_rate REAL DEFAULT 0,
  min_order_amount REAL DEFAULT 0,
  qr_code_base_url TEXT,
  admin_pwd_hash TEXT NOT NULL,
  jwt_secret TEXT NOT NULL,
  wechat_pay_config TEXT,
  alipay_config TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dish_category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dish_category_sort ON dish_category(sort_order);

CREATE TABLE IF NOT EXISTS dish (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  price REAL NOT NULL,
  original_price REAL,
  cost_price REAL,
  image_url TEXT,
  unit TEXT DEFAULT '碗',
  portion_size TEXT,
  soup_bases TEXT NOT NULL DEFAULT '[]',
  styles TEXT NOT NULL DEFAULT '[]',
  addons TEXT NOT NULL DEFAULT '[]',
  has_inventory INTEGER DEFAULT 0,
  total_stock INTEGER DEFAULT 0,
  remaining_stock INTEGER,
  low_stock_threshold INTEGER DEFAULT 10,
  is_sold_out INTEGER DEFAULT 0,
  max_per_order INTEGER DEFAULT 99,
  is_spicy INTEGER DEFAULT 0,
  spicy_level INTEGER CHECK (spicy_level BETWEEN 1 AND 5),
  is_vegetarian INTEGER DEFAULT 0,
  is_vegan INTEGER DEFAULT 0,
  allergens TEXT,
  tags TEXT,
  is_recommended INTEGER DEFAULT 0,
  is_available INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  avg_rating REAL DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  last_restock_at TEXT,
  FOREIGN KEY (category_id) REFERENCES dish_category(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dish_category ON dish(category_id);
CREATE INDEX IF NOT EXISTS idx_dish_status ON dish(status, is_available, is_sold_out);
CREATE INDEX IF NOT EXISTS idx_dish_recommended ON dish(is_recommended, is_available);
CREATE INDEX IF NOT EXISTS idx_dish_deleted ON dish(deleted_at);

CREATE TABLE IF NOT EXISTS dish_inventory_log (
  id TEXT PRIMARY KEY,
  dish_id TEXT NOT NULL,
  log_type TEXT CHECK (log_type IN ('restock','sale','waste','adjustment','return')),
  change_quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  note TEXT,
  operator_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dish_id) REFERENCES dish(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dish_inventory_log_dish ON dish_inventory_log(dish_id);

CREATE TABLE IF NOT EXISTS cart (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT NOT NULL,
  table_number TEXT NOT NULL,
  dish_id TEXT NOT NULL,
  dish_snapshot TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  soup_base TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL DEFAULT '',
  addons TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','ordered','deleted')),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dish_id) REFERENCES dish(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart(session_id, table_number);
CREATE INDEX IF NOT EXISTS idx_cart_status ON cart(status, expires_at);

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  nickname TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'zh-CN',
  role TEXT DEFAULT 'guest' CHECK (role IN ('guest','member','admin')),
  membership_level TEXT DEFAULT 'bronze' CHECK (membership_level IN ('bronze','silver','gold')),
  membership_points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_phone ON "user"(phone);

CREATE TABLE IF NOT EXISTS user_order (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  user_id TEXT,
  guest_session_id TEXT,
  table_number TEXT NOT NULL,
  order_type TEXT DEFAULT 'dine_in' CHECK (order_type IN ('dine_in','takeout')),
  diners_count INTEGER DEFAULT 1,
  item_count INTEGER DEFAULT 0,
  subtotal_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  service_fee_amount REAL DEFAULT 0,
  packaging_fee REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  payment_method TEXT,
  payment_channel TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','processing','paid','failed','refunded','cancelled')),
  payment_id TEXT,
  transaction_id TEXT,
  paid_at TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','confirmed','preparing','ready','completed','cancelled','refunded')),
  confirmed_at TEXT,
  preparing_at TEXT,
  ready_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  user_remark TEXT,
  admin_remark TEXT,
  cancel_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_table ON user_order(table_number);
CREATE INDEX IF NOT EXISTS idx_order_status ON user_order(status);
CREATE INDEX IF NOT EXISTS idx_order_created ON user_order(created_at);
CREATE INDEX IF NOT EXISTS idx_order_no ON user_order(order_no);

CREATE TABLE IF NOT EXISTS order_item (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  dish_id TEXT,
  dish_snapshot TEXT NOT NULL,
  soup_base TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL DEFAULT '',
  addons TEXT NOT NULL DEFAULT '[]',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  subtotal_amount REAL NOT NULL,
  customization_details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','served','cancelled')),
  served_at TEXT,
  cancelled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES user_order(id) ON DELETE CASCADE,
  FOREIGN KEY (dish_id) REFERENCES dish(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_item_order ON order_item(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_status ON order_item(status);

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO system_config (id, config_key, config_value, description) VALUES
('1', 'supported_languages', 'zh-CN,en,zh-TW', '支持的语言列表'),
('2', 'default_language', 'zh-CN', '默认语言'),
('3', 'tax_rate', '0', '默认税率'),
('4', 'min_order_amount', '0', '起送金额')
ON CONFLICT(config_key) DO UPDATE SET
  config_value = excluded.config_value,
  updated_at = datetime('now');
