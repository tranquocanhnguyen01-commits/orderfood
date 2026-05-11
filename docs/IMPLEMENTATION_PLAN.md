# Build Plan - 14 Days (MVP)

## Day 1-2: Foundation
- Initialize monorepo (frontend + backend)
- Setup PostgreSQL and migration tool
- Implement base entities: users, tables, menu, orders

## Day 3-4: Public Customer Flow
- Public menu API with QR signature validation
- Customer ordering page (mobile-first)
- Place order API

## Day 5-6: Kitchen Realtime
- WebSocket channel for new order notifications
- Kitchen screen list by status
- Update order status API and realtime broadcast

## Day 7-8: Cashier/Staff
- Staff login (JWT)
- Staff dashboard: active tables, order details
- Payment API and payment status update

## Day 9-10: Admin Basic CRUD
- Manage tables
- Manage menu categories/items
- Generate QR URLs per table

## Day 11-12: Hardening
- Validation and error handling
- Audit logs for status/payment changes
- Basic role permissions

## Day 13-14: UAT + Deployment
- End-to-end test scripts for core scenarios
- Seed sample menu data
- Deploy backend + frontend + managed Postgres

## Definition of Done (MVP)
- Customer can scan QR and place order without login
- Kitchen receives order in under 2 seconds
- Staff can complete payment and close session
- Admin can edit menu and table metadata
