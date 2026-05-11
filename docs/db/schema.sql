-- QR Restaurant Ordering App - MySQL 8 schema (MVP)

create table users (
  id bigint primary key auto_increment,
  full_name varchar(120) not null,
  username varchar(60) not null unique,
  password_hash varchar(255) not null,
  role enum('admin', 'staff', 'kitchen') not null,
  is_active boolean not null default true,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
);

create table tables (
  id bigint primary key auto_increment,
  code varchar(20) not null unique,
  name varchar(120) not null,
  capacity int not null default 4,
  zone varchar(60),
  is_active boolean not null default true,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
);

create table table_qr_tokens (
  id bigint primary key auto_increment,
  table_id bigint not null,
  token_signature varchar(255) not null,
  expires_at datetime null,
  is_revoked boolean not null default false,
  created_at datetime not null default current_timestamp,
  constraint fk_qr_table foreign key (table_id) references tables(id)
);

create table menu_categories (
  id bigint primary key auto_increment,
  name varchar(120) not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
);

create table menu_items (
  id bigint primary key auto_increment,
  category_id bigint not null,
  sku varchar(50) unique,
  name varchar(160) not null,
  description text,
  image_url text,
  price decimal(12,2) not null,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint fk_menu_category foreign key (category_id) references menu_categories(id)
);

create table table_sessions (
  id bigint primary key auto_increment,
  table_id bigint not null,
  opened_at datetime not null default current_timestamp,
  closed_at datetime null,
  guest_count int null,
  note text,
  is_open boolean not null default true,
  constraint fk_session_table foreign key (table_id) references tables(id)
);

create table orders (
  id bigint primary key auto_increment,
  order_code varchar(30) not null unique,
  table_id bigint not null,
  session_id bigint not null,
  status enum('new', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled') not null default 'new',
  payment_status enum('unpaid', 'partially_paid', 'paid', 'refunded') not null default 'unpaid',
  customer_note text,
  created_by_user_id bigint null,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint fk_order_table foreign key (table_id) references tables(id),
  constraint fk_order_session foreign key (session_id) references table_sessions(id),
  constraint fk_order_user foreign key (created_by_user_id) references users(id)
);

create table order_items (
  id bigint primary key auto_increment,
  order_id bigint not null,
  menu_item_id bigint not null,
  item_name_snapshot varchar(160) not null,
  unit_price_snapshot decimal(12,2) not null,
  quantity int not null,
  note varchar(255),
  kitchen_status enum('new', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled') not null default 'new',
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint fk_order_item_order foreign key (order_id) references orders(id) on delete cascade,
  constraint fk_order_item_menu foreign key (menu_item_id) references menu_items(id)
);

create table payments (
  id bigint primary key auto_increment,
  order_id bigint not null,
  amount decimal(12,2) not null,
  method enum('cash', 'card', 'bank_transfer', 'e_wallet') not null,
  paid_at datetime not null default current_timestamp,
  paid_by_user_id bigint null,
  transaction_ref varchar(120),
  note text,
  created_at datetime not null default current_timestamp,
  constraint fk_payment_order foreign key (order_id) references orders(id),
  constraint fk_payment_user foreign key (paid_by_user_id) references users(id)
);

create table order_status_logs (
  id bigint primary key auto_increment,
  order_id bigint not null,
  from_status enum('new', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled') null,
  to_status enum('new', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled') not null,
  changed_by_user_id bigint null,
  reason text,
  created_at datetime not null default current_timestamp,
  constraint fk_status_log_order foreign key (order_id) references orders(id) on delete cascade,
  constraint fk_status_log_user foreign key (changed_by_user_id) references users(id)
);

create index idx_orders_table_id_created_at on orders(table_id, created_at desc);
create index idx_orders_status on orders(status);
create index idx_order_items_order_id on order_items(order_id);
create index idx_payments_order_id on payments(order_id);
