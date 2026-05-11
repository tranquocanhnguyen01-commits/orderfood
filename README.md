# QR Restaurant Ordering - Starter Kit (MySQL)

This workspace includes a runnable backend MVP scaffold using Express + Prisma + MySQL.

## Included
- Architecture blueprint: `docs/architecture/blueprint.md`
- MySQL schema: `docs/db/schema.sql`
- OpenAPI spec: `docs/api/openapi.yaml`
- 14-day implementation plan: `docs/IMPLEMENTATION_PLAN.md`
- Local MySQL via Docker: `docker-compose.yml`
- Backend scaffold: `backend/`
- Seed + utilities scripts: `backend/scripts/`
- Postman collection: `backend/postman/`

## Quick Start
1. Start MySQL:
   - `docker compose up -d`
2. Prepare backend env:
   - `Copy-Item .env.example backend/.env`
3. Install backend dependencies:
   - `cd backend`
   - `npm install`
4. Prisma generate + migrate:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
5. Seed sample data:
   - `npm run seed`
6. Generate QR links:
   - `npm run qr:links`
7. Generate staff JWT token:
   - `npm run token:staff`
8. Run API:
   - `npm run dev`

## Implemented MVP Endpoints
- `GET /api/public/menu?tableCode=T01&signature=...`
- `POST /api/public/orders`
- `GET /api/staff/orders`
- `PATCH /api/staff/orders/:id/status`
- `POST /api/staff/payments`

## Scripts
- `npm run seed`: seed users, tables, categories, menu items
- `npm run qr:links`: print signed customer order links by table
- `npm run token:staff`: print JWT token for staff testing

## Seeded Accounts (demo)
- admin / admin123
- staff1 / staff123
- kitchen1 / kitchen123

Note: Passwords are hashed with SHA-256 in seed script for demo purpose only.
