import { Router } from 'express';
import { requireValidQr } from '../middleware/require-valid-qr.js';
import { requireStaffAuth } from '../middleware/require-staff-auth.js';
import {
  createMenuItemByAdmin,
  createPayment,
  createPublicOrder,
  getPublicMenu,
  listMenuCategories,
  listPublicTableOrders,
  listStaffOrderHistory,
  listStaffOrders,
  payOpenSessionByTable,
  updateOrderItemStatus
} from '../services/order-service.js';
import { login } from '../services/auth-service.js';

const router = Router();

router.post('/auth/login', login);

router.get('/public/menu', requireValidQr, getPublicMenu);
router.get('/public/table-orders', requireValidQr, listPublicTableOrders);
router.post('/public/orders', requireValidQr, createPublicOrder);

router.get('/staff/menu-categories', requireStaffAuth, listMenuCategories);
router.post('/staff/menu-items', requireStaffAuth, createMenuItemByAdmin);

router.get('/staff/orders', requireStaffAuth, listStaffOrders);
router.get('/staff/orders/history', requireStaffAuth, listStaffOrderHistory);
router.patch('/staff/order-items/:id/status', requireStaffAuth, updateOrderItemStatus);
router.post('/staff/payments', requireStaffAuth, createPayment);
router.post('/staff/tables/:tableCode/pay-open-session', requireStaffAuth, payOpenSessionByTable);

export default router;
