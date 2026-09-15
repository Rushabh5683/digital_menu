import { prisma } from '../../lib/prisma.js';

export async function getHealth() {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: 'ok',
    service: 'digital-menu-api',
    database: 'connected',
    timestamp: new Date().toISOString(),
    // Bump when shipping route/API changes so deploys are easy to verify.
    revision: '2026-09-16-staff-appreciation-captains',
    features: {
      staffAppreciation: true,
      captainDelete: true,
      partPayment: true,
    },
  };
}
