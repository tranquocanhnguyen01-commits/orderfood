import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function signTableCode(tableCode, secret) {
  return crypto.createHmac('sha256', secret).update(tableCode).digest('hex');
}

async function main() {
  const baseUrl = process.env.ORDER_BASE_URL || 'http://localhost:3000';
  const secret = process.env.QR_SIGN_SECRET;

  if (!secret) {
    throw new Error('Missing QR_SIGN_SECRET in env');
  }

  const tables = await prisma.table.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });

  for (const t of tables) {
    const signature = signTableCode(t.code, secret);
    const url = `${baseUrl}/order?tableCode=${encodeURIComponent(t.code)}&signature=${signature}`;
    console.log(`${t.code}: ${url}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
