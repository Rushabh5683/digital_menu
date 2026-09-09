import { prisma } from '../../lib/prisma.js';

export async function getHealth() {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: 'ok',
    service: 'digital-menu-api',
    database: 'connected',
    timestamp: new Date().toISOString(),
  };
}
