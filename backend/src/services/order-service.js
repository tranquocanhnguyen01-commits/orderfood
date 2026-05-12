import { prisma } from '../prisma.js';
import { toJson } from '../utils/to-json.js';

const ITEM_STATUSES = new Set(['new', 'preparing', 'ready', 'served', 'cancelled']);
const PAYMENT_METHODS = new Set(['cash', 'card', 'bank_transfer', 'e_wallet']);
const TERMINAL_ORDER_STATUSES = new Set(['completed', 'cancelled']);

const ITEM_ALLOWED_TRANSITIONS = {
  new: new Set(['preparing', 'cancelled']),
  preparing: new Set(['ready', 'cancelled']),
  ready: new Set(['served', 'cancelled']),
  served: new Set([]),
  cancelled: new Set([])
};

function toNumber(v) {
  return Number(v);
}

function toCents(v) {
  return Math.round(Number(v) * 100);
}

function deriveOrderStatusFromItems(items) {
  if (!items.length) return 'new';
  const has = (s) => items.some((i) => i.kitchenStatus === s);
  const all = (s) => items.every((i) => i.kitchenStatus === s);

  if (all('cancelled')) return 'cancelled';
  if (has('new')) return 'new';
  if (has('preparing')) return 'preparing';
  if (has('ready')) return 'ready';
  if (items.every((i) => i.kitchenStatus === 'served' || i.kitchenStatus === 'cancelled')) return 'served';
  return 'preparing';
}

function calcOrderTotalCents(order) {
  return (order.items || []).reduce(
    (sum, item) => sum + toCents(item.unitPriceSnapshot) * Number(item.quantity),
    0
  );
}

async function syncOrderStatusFromItems(orderId, changedByUserId, reason) {
  const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, include: { items: true } });
  if (!order) return null;

  const nextStatus = deriveOrderStatusFromItems(order.items);
  if (order.status === nextStatus) return order;

  return prisma.order.update({
    where: { id: Number(orderId) },
    data: {
      status: nextStatus,
      statusLogs: {
        create: {
          fromStatus: order.status,
          toStatus: nextStatus,
          reason: reason || 'Auto sync from item statuses',
          changedByUserId: changedByUserId ? BigInt(changedByUserId) : null
        }
      }
    },
    include: { items: true, table: true }
  });
}

async function markOrderPaidAndCompleted(tx, order, method, userId, transactionRef, note) {
  const amount = calcOrderTotalCents(order) / 100;

  await tx.payment.create({
    data: {
      orderId: Number(order.id),
      amount,
      method,
      transactionRef: transactionRef || null,
      note: note || null,
      paidByUserId: userId ? BigInt(userId) : null
    }
  });

  await tx.order.update({
    where: { id: Number(order.id) },
    data: {
      paymentStatus: 'paid',
      status: 'completed',
      statusLogs: {
        create: {
          fromStatus: order.status,
          toStatus: 'completed',
          reason: 'Auto completed after payment',
          changedByUserId: userId ? BigInt(userId) : null
        }
      }
    }
  });

  return amount;
}

export async function getPublicMenu(req, res) {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
      }
    }
  });
  return res.json(toJson({ categories }));
}

export async function listMenuCategories(req, res) {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
  });
  return res.json(toJson({ categories }));
}

export async function createMenuItemByAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can add menu items' });
  }

  const { categoryId, name, price, description, imageUrl, sku, sortOrder } = req.body;
  if (!categoryId || !name || Number(price) <= 0) {
    return res.status(400).json({ message: 'categoryId, name and positive price are required' });
  }

  const category = await prisma.menuCategory.findUnique({ where: { id: Number(categoryId) } });
  if (!category || !category.isActive) {
    return res.status(404).json({ message: 'Menu category not found or inactive' });
  }

  const created = await prisma.menuItem.create({
    data: {
      categoryId: Number(categoryId),
      name: String(name).trim(),
      price: Number(price),
      description: description ? String(description).trim() : null,
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      sku: sku ? String(sku).trim() : null,
      sortOrder: Number.isInteger(Number(sortOrder)) ? Number(sortOrder) : 0,
      isAvailable: true
    }
  });

  return res.status(201).json(toJson({ item: created }));
}

export async function createPublicOrder(req, res) {
  const { items, customerNote } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order items are required' });
  }

  const invalidQty = items.some((item) => !Number.isInteger(toNumber(item.quantity)) || toNumber(item.quantity) <= 0);
  if (invalidQty) {
    return res.status(400).json({ message: 'Each item quantity must be a positive integer' });
  }

  const table = await prisma.table.findUnique({ where: { code: req.tableCode } });
  if (!table || !table.isActive) {
    return res.status(404).json({ message: 'Table not found or inactive' });
  }

  let session = await prisma.tableSession.findFirst({ where: { tableId: table.id, isOpen: true }, orderBy: { id: 'desc' } });
  if (!session) session = await prisma.tableSession.create({ data: { tableId: table.id } });

  const menuIds = items.map((i) => toNumber(i.menuItemId));
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuIds }, isAvailable: true } });
  if (menuItems.length !== menuIds.length) {
    return res.status(400).json({ message: 'Some menu items are invalid/unavailable' });
  }

  const map = new Map(menuItems.map((m) => [Number(m.id), m]));
  const orderCode = `ORD-${Date.now()}`;

  const created = await prisma.order.create({
    data: {
      orderCode,
      tableId: table.id,
      sessionId: session.id,
      customerNote: customerNote || null,
      items: {
        create: items.map((item) => {
          const menu = map.get(toNumber(item.menuItemId));
          return {
            menuItemId: menu.id,
            itemNameSnapshot: menu.name,
            unitPriceSnapshot: menu.price,
            quantity: toNumber(item.quantity),
            note: item.note || null,
            kitchenStatus: 'new'
          };
        })
      },
      statusLogs: { create: { toStatus: 'new' } }
    },
    include: { items: true }
  });

  return res.status(201).json(toJson(created));
}

export async function listPublicTableOrders(req, res) {
  const table = await prisma.table.findUnique({ where: { code: req.tableCode } });
  if (!table || !table.isActive) return res.status(404).json({ message: 'Table not found or inactive' });

  const session = await prisma.tableSession.findFirst({ where: { tableId: table.id, isOpen: true }, orderBy: { id: 'desc' } });
  if (!session) return res.json(toJson({ session: null, orders: [] }));

  const orders = await prisma.order.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' }, include: { items: true } });
  return res.json(toJson({ session, orders }));
}

export async function listStaffOrders(req, res) {
  const { status, tableCode } = req.query;
  const where = {};

  if (status) where.status = String(status);
  if (tableCode) {
    const table = await prisma.table.findUnique({ where: { code: String(tableCode) } });
    where.tableId = table ? table.id : -1;
  }

  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, include: { items: true, table: true } });
  return res.json(toJson({ orders }));
}


export async function listStaffOrderHistory(req, res) {
  const { tableCode, status, dateFrom, dateTo } = req.query;

  const where = {
    session: {
      isOpen: false
    }
  };

  if (status) where.status = String(status);

  if (tableCode) {
    const table = await prisma.table.findUnique({ where: { code: String(tableCode) } });
    where.tableId = table ? table.id : -1;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ sessionId: 'desc' }, { createdAt: 'desc' }],
    include: { items: true, table: true, session: true }
  });

  return res.json(toJson({ orders }));
}
export async function updateOrderItemStatus(req, res) {
  const itemId = Number(req.params.id);
  const { status, reason } = req.body;

  if (!ITEM_STATUSES.has(String(status))) return res.status(400).json({ message: 'Invalid item status' });

  const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
  if (!item) return res.status(404).json({ message: 'Order item not found' });
  if (!item.order) return res.status(404).json({ message: 'Order not found' });

  if (TERMINAL_ORDER_STATUSES.has(item.order.status)) {
    return res.status(409).json({ message: `Order already ${item.order.status}, item status cannot be changed` });
  }
  if (status === item.kitchenStatus) return res.status(400).json({ message: 'Item is already in this status' });
  if (!(ITEM_ALLOWED_TRANSITIONS[item.kitchenStatus]?.has(status))) {
    return res.status(409).json({ message: `Invalid item transition from ${item.kitchenStatus} to ${status}` });
  }

  const role = req.user?.role;
  if (role === 'kitchen' && (status === 'served' || status === 'cancelled')) {
    return res.status(403).json({ message: 'Kitchen role cannot set served/cancelled' });
  }

  await prisma.orderItem.update({ where: { id: itemId }, data: { kitchenStatus: status } });
  const syncedOrder = await syncOrderStatusFromItems(item.orderId, req.user?.id, reason);
  return res.json(toJson({ ok: true, order: syncedOrder }));
}

export async function createPayment(req, res) {
  const { orderId, amount, method, transactionRef, note } = req.body;

  if (!PAYMENT_METHODS.has(String(method))) return res.status(400).json({ message: 'Invalid payment method' });
  if (Number(amount) <= 0) return res.status(400).json({ message: 'Payment amount must be greater than 0' });

  const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, include: { items: true } });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status === 'cancelled') return res.status(409).json({ message: 'Cannot pay a cancelled order' });
  if (order.status !== 'served') return res.status(409).json({ message: 'Order must be in served status before payment' });
  if (order.paymentStatus === 'paid') return res.status(409).json({ message: 'Order already paid' });

  const totalCents = calcOrderTotalCents(order);
  const paidCents = toCents(amount);
  if (paidCents !== totalCents) return res.status(409).json({ message: `Payment amount mismatch. Expected ${totalCents / 100}` });

  const payment = await prisma.$transaction(async (tx) => {
    await markOrderPaidAndCompleted(tx, order, method, req.user?.id, transactionRef, note);
    return tx.payment.findFirst({ where: { orderId: Number(order.id) }, orderBy: { id: 'desc' } });
  });

  return res.status(201).json(toJson(payment));
}

export async function payOpenSessionByTable(req, res) {
  const tableCode = String(req.params.tableCode || '').trim();
  const method = String(req.body?.method || 'cash');

  if (!tableCode) return res.status(400).json({ message: 'tableCode is required' });
  if (!PAYMENT_METHODS.has(method)) return res.status(400).json({ message: 'Invalid payment method' });

  const table = await prisma.table.findUnique({ where: { code: tableCode } });
  if (!table) return res.status(404).json({ message: 'Table not found' });

  const session = await prisma.tableSession.findFirst({ where: { tableId: table.id, isOpen: true }, orderBy: { id: 'desc' } });
  if (!session) return res.status(404).json({ message: 'No open session for this table' });

  const orders = await prisma.order.findMany({ where: { sessionId: session.id }, include: { items: true } });

  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'paid' && o.status !== 'cancelled');
  const notServed = unpaidOrders.filter((o) => o.status !== 'served');
  if (notServed.length > 0) {
    return res.status(409).json({
      message: 'Cannot pay table: some orders are not served yet',
      blockingOrderCodes: notServed.map((o) => o.orderCode)
    });
  }

  const payable = unpaidOrders.filter((o) => o.status === 'served');
  if (payable.length === 0) {
    return res.status(409).json({ message: 'No served unpaid orders to pay for this table' });
  }

  const result = await prisma.$transaction(async (tx) => {
    let total = 0;
    const paidOrders = [];

    for (const order of payable) {
      const amount = await markOrderPaidAndCompleted(tx, order, method, req.user?.id, null, 'Table-level payment');
      total += amount;
      paidOrders.push({ orderId: Number(order.id), orderCode: order.orderCode, amount });
    }

    await tx.tableSession.update({
      where: { id: session.id },
      data: {
        isOpen: false,
        closedAt: new Date()
      }
    });

    return { totalAmount: total, paidOrdersCount: paidOrders.length, paidOrders };
  });

  return res.json(toJson({ tableCode, sessionId: session.id, sessionClosed: true, ...result }));
}

