import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hashPassword(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function ensureCategory(name, sortOrder) {
  const existing = await prisma.menuCategory.findFirst({ where: { name } });
  if (existing) {
    return prisma.menuCategory.update({
      where: { id: existing.id },
      data: { isActive: true, sortOrder }
    });
  }
  return prisma.menuCategory.create({ data: { name, sortOrder, isActive: true } });
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      fullName: 'System Admin',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      role: 'admin'
    }
  });

  const staff = await prisma.user.upsert({
    where: { username: 'staff1' },
    update: {},
    create: {
      fullName: 'Cashier Staff',
      username: 'staff1',
      passwordHash: hashPassword('staff123'),
      role: 'staff'
    }
  });

  const kitchen = await prisma.user.upsert({
    where: { username: 'kitchen1' },
    update: {},
    create: {
      fullName: 'Kitchen User',
      username: 'kitchen1',
      passwordHash: hashPassword('kitchen123'),
      role: 'kitchen'
    }
  });

  const tables = [];
  for (let i = 1; i <= 10; i += 1) {
    const code = `T${String(i).padStart(2, '0')}`;
    const t = await prisma.table.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: `Table ${i}`,
        capacity: i <= 4 ? 4 : 6,
        zone: i <= 5 ? 'A' : 'B'
      }
    });
    tables.push(t);
  }

  const mains = await ensureCategory('Main Dishes', 1);
  const drinks = await ensureCategory('Drinks', 2);

  const menuSeed = [
    { sku: 'PHO-BO', name: 'Pho Bo', price: 65000, categoryId: mains.id },
    { sku: 'COM-GA', name: 'Com Ga', price: 55000, categoryId: mains.id },
    { sku: 'BUN-CHA', name: 'Bun Cha', price: 60000, categoryId: mains.id },
    { sku: 'TEA-PEACH', name: 'Peach Tea', price: 35000, categoryId: drinks.id },
    { sku: 'COFFEE-BLACK', name: 'Black Coffee', price: 30000, categoryId: drinks.id }
  ];

  for (const item of menuSeed) {
    await prisma.menuItem.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        price: item.price,
        isAvailable: true,
        categoryId: item.categoryId
      },
      create: {
        sku: item.sku,
        name: item.name,
        price: item.price,
        categoryId: item.categoryId,
        isAvailable: true
      }
    });
  }

  console.log('Seed completed');
  console.log(`Users: admin=${admin.username}, staff=${staff.username}, kitchen=${kitchen.username}`);
  console.log(`Tables seeded: ${tables.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
